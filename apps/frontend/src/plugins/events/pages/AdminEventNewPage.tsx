import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, CardBody, PageHeader } from '@helix-x/design-system';
import type { CreateEventDto } from '@helix-x-rawla/client-sdk';
import { AdminRail } from '../components/AdminRail';
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
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <AdminRail />
      <PageHeader
        title="New event"
        description="Saved as a draft. Add tickets and publish it from the next screen."
        actions={
          <Link to="/admin/events">
            <Button variant="secondary">Cancel</Button>
          </Link>
        }
      />
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
  );
}
