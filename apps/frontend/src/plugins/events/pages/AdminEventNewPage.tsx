import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, CardBody } from '@helix-x/web/design-system';
import type { CreateEventDto } from '@helix-x-rawla/client-sdk';
import { PortalAdminLayout } from '../../../shared/PortalAdminLayout';
import { EventForm } from '../components/EventForm';
import { createEvent } from '../hooks/useEventAdmin';

/**
 * Create an event (EVT-16). It starts as a draft: tickets, time slots and the
 * flyer are added on the next screen, and nobody is invited until it is
 * published.
 */
export function AdminEventNewPage() {
  const navigate = useNavigate();

  return (
    <PortalAdminLayout
        title="New event"
        description="Saved as a draft. Add tickets and publish it from the next screen."
        actions={
          <Link to="/admin/events">
            <Button variant="secondary">Cancel</Button>
          </Link>
        }
    >
      <div className="max-w-4xl">
      <Card>
        <CardBody>
          <EventForm
            submitLabel="Create draft"
            onSubmit={async (values) => {
              const event = await createEvent(values as CreateEventDto);
              navigate(`/admin/events/${event.id}`);
            }}
          />
        </CardBody>
      </Card>
      </div>
    </PortalAdminLayout>
  );
}
