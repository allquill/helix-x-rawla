import { BadRequestException, Injectable, NotFoundException, type StreamableFile } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Response } from 'express';
import { In, Repository } from 'typeorm';
import { type AuthenticatedUser } from '@helix-x/backend';
import { ChildProfile } from '../../community-core/entities/child-profile.entity';
import { Member } from '../../community-core/entities/member.entity';
import { AuditService } from '../../community-core/providers/audit.service';
import { canViewLevel } from '../../portal-files/doc-level-rules';
import { PortalFile } from '../../portal-files/entities/portal-file.entity';
import { PortalFileService, type UploadedPortalFile } from '../../portal-files/portal-file.service';
import { MemberCertificate } from '../entities/member-certificate.entity';
import { PortalEvent } from '../entities/portal-event.entity';
import type { CertificateDto, UploadCertificateDto } from '../models/operations.dto';

/**
 * Certificates prepared outside the portal and uploaded to a profile (REC-07),
 * for the member or parent to download (REC-08). The portal creates none
 * itself.
 *
 * They are DOC level 2 — personal. A certificate is the member's whose profile
 * it is filed under; a child's is filed under the parent and is also the
 * other parent's, through the shared household.
 */
@Injectable()
export class CertificateService {
  constructor(
    @InjectRepository(MemberCertificate) private readonly certificateRepo: Repository<MemberCertificate>,
    @InjectRepository(Member) private readonly memberRepo: Repository<Member>,
    @InjectRepository(ChildProfile) private readonly childRepo: Repository<ChildProfile>,
    @InjectRepository(PortalEvent) private readonly eventRepo: Repository<PortalEvent>,
    @InjectRepository(PortalFile) private readonly fileRepo: Repository<PortalFile>,
    private readonly files: PortalFileService,
    private readonly audit: AuditService,
  ) {}

  /** The viewer's own certificates and those of the children in their household. */
  async listMine(viewer: AuthenticatedUser): Promise<CertificateDto[]> {
    const self = await this.memberRepo.findOne({ where: { userId: viewer.id } });
    if (!self) return [];
    const children = await this.childRepo.find({
      where: { householdId: self.householdId },
      select: { id: true },
    });
    const certificates = await this.certificateRepo.find({
      where: [
        { memberId: self.id },
        ...(children.length ? [{ childProfileId: In(children.map((c) => c.id)) }] : []),
      ],
      order: { createdAt: 'DESC' },
    });
    return this.toDtos(certificates);
  }

  async listForMember(memberId: string): Promise<CertificateDto[]> {
    await this.mustFindMember(memberId);
    return this.toDtos(
      await this.certificateRepo.find({ where: { memberId }, order: { createdAt: 'DESC' } }),
    );
  }

  async upload(
    memberId: string,
    file: UploadedPortalFile | undefined,
    dto: UploadCertificateDto,
    actor: AuthenticatedUser,
  ): Promise<CertificateDto> {
    const member = await this.mustFindMember(memberId);
    if (dto.childProfileId) {
      const child = await this.childRepo.findOne({ where: { id: dto.childProfileId } });
      if (!child || child.householdId !== member.householdId) {
        throw new BadRequestException('That child is not in this member’s household');
      }
    }
    if (dto.eventId) {
      const event = await this.eventRepo.findOne({ where: { id: dto.eventId } });
      if (!event) throw new BadRequestException('Unknown event');
    }

    const stored = await this.files.store(file, 'certificates', actor.id);
    const certificate = await this.certificateRepo.save(
      this.certificateRepo.create({
        memberId,
        childProfileId: dto.childProfileId || null,
        eventId: dto.eventId || null,
        title: dto.title.trim(),
        fileId: stored.id,
        uploadedByUserId: actor.id,
      }),
    );
    await this.audit.record({
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action: 'certificate.uploaded',
      entityType: 'member',
      entityId: memberId,
      after: {
        certificateId: certificate.id,
        title: certificate.title,
        childProfileId: certificate.childProfileId,
        eventId: certificate.eventId,
      },
    });
    return (await this.toDtos([certificate]))[0];
  }

  /** Anyone who may not see it gets 404, so a certificate's existence is not disclosed. */
  async send(certificateId: string, viewer: AuthenticatedUser, response: Response): Promise<StreamableFile> {
    const certificate = await this.certificateRepo.findOne({ where: { id: certificateId } });
    if (!certificate) throw new NotFoundException('Certificate not found');
    if (!canViewLevel(2, { roles: viewer.roles ?? [], isOwner: await this.isOwner(certificate, viewer) })) {
      throw new NotFoundException('Certificate not found');
    }
    return this.files.send(certificate.fileId, response);
  }

  async remove(certificateId: string, actor: AuthenticatedUser): Promise<void> {
    const certificate = await this.certificateRepo.findOne({ where: { id: certificateId } });
    if (!certificate) throw new NotFoundException('Certificate not found');
    await this.certificateRepo.delete({ id: certificateId });
    await this.files.remove(certificate.fileId);
    await this.audit.record({
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action: 'certificate.deleted',
      entityType: 'member',
      entityId: certificate.memberId,
      before: { certificateId, title: certificate.title },
    });
  }

  private async isOwner(certificate: MemberCertificate, viewer: AuthenticatedUser): Promise<boolean> {
    const self = await this.memberRepo.findOne({ where: { userId: viewer.id } });
    if (!self) return false;
    if (self.id === certificate.memberId) return true;
    if (!certificate.childProfileId) return false;
    const child = await this.childRepo.findOne({ where: { id: certificate.childProfileId } });
    return child !== null && child.householdId === self.householdId;
  }

  private async mustFindMember(memberId: string): Promise<Member> {
    const member = await this.memberRepo.findOne({ where: { id: memberId } });
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }

  private async toDtos(certificates: MemberCertificate[]): Promise<CertificateDto[]> {
    if (certificates.length === 0) return [];
    const ids = <T>(pick: (c: MemberCertificate) => T | null) =>
      [...new Set(certificates.map(pick).filter((v): v is NonNullable<T> => v != null))];
    const [files, children, events] = await Promise.all([
      this.fileRepo.find({ where: { id: In(ids((c) => c.fileId)) } }),
      this.childRepo.find({ where: { id: In(ids((c) => c.childProfileId)) } }),
      this.eventRepo.find({ where: { id: In(ids((c) => c.eventId)) }, select: { id: true, title: true } }),
    ]);
    const fileById = new Map<string, PortalFile>(files.map((f) => [f.id, f]));
    const childName = new Map<string, string>(children.map((c) => [c.id, `${c.firstName} ${c.lastName}`]));
    const eventTitle = new Map<string, string>(events.map((e) => [e.id, e.title]));
    return certificates.map((c) => {
      const file = fileById.get(c.fileId);
      return {
        id: c.id,
        memberId: c.memberId,
        childProfileId: c.childProfileId,
        childName: c.childProfileId ? (childName.get(c.childProfileId) ?? null) : null,
        eventId: c.eventId,
        eventTitle: c.eventId ? (eventTitle.get(c.eventId) ?? null) : null,
        title: c.title,
        fileName: file?.name ?? 'Missing file',
        mimeType: file?.mimeType ?? 'application/octet-stream',
        sizeBytes: file?.sizeBytes ?? 0,
        createdAt: c.createdAt,
      };
    });
  }
}
