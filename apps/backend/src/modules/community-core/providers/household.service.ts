import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthenticatedUser } from '@helix-x/backend';
import { ChildProfile } from '../entities/child-profile.entity';
import { Member } from '../entities/member.entity';
import { SpouseProfile } from '../entities/spouse-profile.entity';
import type { UpsertChildDto } from '../models/household.dto';
import type { RegistrationSpouseDto } from '../models/registration.dto';
import { AuditService } from './audit.service';
import { ageInYears } from './member-registration.service';

/**
 * Same ceiling the join form's DTO allows. The data model does not encode the
 * form's cap of three (gap #3); this only stops an unbounded list.
 */
const MAX_CHILDREN = 10;

const blank = (value: string | undefined): string | null => value?.trim() || null;

/**
 * Spouse and child records added or changed after joining (MP-17 / MP-18).
 *
 * Both are optional at registration, so this is where most households get
 * filled in. Every method takes the member already resolved from the caller's
 * own session — nothing here accepts a member id from the request.
 */
@Injectable()
export class HouseholdService {
  constructor(
    @InjectRepository(SpouseProfile) private readonly spouseRepo: Repository<SpouseProfile>,
    @InjectRepository(ChildProfile) private readonly childRepo: Repository<ChildProfile>,
    private readonly audit: AuditService,
  ) {}

  async upsertSpouse(member: Member, dto: RegistrationSpouseDto, actor: AuthenticatedUser): Promise<void> {
    const existing = await this.spouseRepo.findOne({ where: { memberId: member.id } });
    const values = {
      firstName: dto.firstName.trim(),
      middleName: blank(dto.middleName),
      lastName: dto.lastName.trim(),
      caste: blank(dto.caste),
      gotra: blank(dto.gotra),
      thikana: blank(dto.thikana),
      nanihal: blank(dto.nanihal),
      email: blank(dto.email),
      phone: blank(dto.phone),
      dateOfBirth: dto.dateOfBirth?.slice(0, 10) ?? null,
      industry: blank(dto.industry),
      education: blank(dto.education),
    };

    const saved = await this.spouseRepo.save(
      existing
        ? Object.assign(existing, values)
        : this.spouseRepo.create({ ...values, memberId: member.id, householdId: member.householdId }),
    );

    await this.record(actor, existing ? 'household.spouse.updated' : 'household.spouse.added', saved.id, {
      firstName: saved.firstName,
      lastName: saved.lastName,
    });
  }

  async removeSpouse(member: Member, actor: AuthenticatedUser): Promise<void> {
    const existing = await this.spouseRepo.findOne({ where: { memberId: member.id } });
    if (!existing) throw new NotFoundException('No spouse on file.');
    await this.spouseRepo.remove(existing);
    await this.record(actor, 'household.spouse.removed', existing.id, null);
  }

  async addChild(member: Member, dto: UpsertChildDto, actor: AuthenticatedUser): Promise<void> {
    const count = await this.childRepo.count({ where: { memberId: member.id } });
    if (count >= MAX_CHILDREN) {
      throw new BadRequestException({
        code: 'TOO_MANY_CHILDREN',
        message: `A household may list at most ${MAX_CHILDREN} children.`,
      });
    }

    const saved = await this.childRepo.save(
      this.childRepo.create({
        ...HouseholdService.childValues(dto),
        memberId: member.id,
        householdId: member.householdId,
        sequence: count + 1,
      }),
    );
    await this.record(actor, 'household.child.added', saved.id, {
      firstName: saved.firstName,
      sequence: saved.sequence,
    });
  }

  async updateChild(
    member: Member,
    childId: string,
    dto: UpsertChildDto,
    actor: AuthenticatedUser,
  ): Promise<void> {
    const child = await this.mustFindChild(member, childId);
    await this.childRepo.save(Object.assign(child, HouseholdService.childValues(dto)));
    await this.record(actor, 'household.child.updated', child.id, { firstName: child.firstName });
  }

  async removeChild(member: Member, childId: string, actor: AuthenticatedUser): Promise<void> {
    const child = await this.mustFindChild(member, childId);
    await this.childRepo.remove(child);

    // Close the gap so sibling order stays 1..n.
    const rest = await this.childRepo.find({
      where: { memberId: member.id },
      order: { sequence: 'ASC' },
    });
    rest.forEach((c, index) => (c.sequence = index + 1));
    await this.childRepo.save(rest);

    await this.record(actor, 'household.child.removed', childId, null);
  }

  /** Youth tier follows from the date of birth (`Child!D12`), as at joining. */
  private static childValues(dto: UpsertChildDto) {
    return {
      firstName: dto.firstName.trim(),
      middleName: blank(dto.middleName),
      lastName: dto.lastName.trim(),
      gender: dto.gender ?? null,
      dateOfBirth: dto.dateOfBirth.slice(0, 10),
      educationLevel: blank(dto.educationLevel),
      achievements: blank(dto.achievements),
      membershipTier: ageInYears(dto.dateOfBirth) < 18 ? 'youth' : 'associate',
    };
  }

  /** 404 for another household's child too — its existence is not ours to confirm. */
  private async mustFindChild(member: Member, childId: string): Promise<ChildProfile> {
    const child = await this.childRepo.findOne({ where: { id: childId, memberId: member.id } });
    if (!child) throw new NotFoundException('Child not found.');
    return child;
  }

  private record(
    actor: AuthenticatedUser,
    action: string,
    entityId: string,
    after: Record<string, unknown> | null,
  ) {
    return this.audit.record({
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action,
      entityType: action.startsWith('household.spouse') ? 'spouse_profile' : 'child_profile',
      entityId,
      after,
    });
  }
}
