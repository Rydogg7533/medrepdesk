import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Archive, Phone, Mail } from 'lucide-react';
import { useContact, useArchiveContact } from '@/hooks/useContacts';
import { useAuth } from '@/context/AuthContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Skeleton from '@/components/ui/Skeleton';
import { formatDate } from '@/utils/formatters';

export default function ContactDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: contact, isLoading } = useContact(id);
  const archiveContact = useArchiveContact();
  const [showArchive, setShowArchive] = useState(false);

  async function handleArchive() {
    await archiveContact.mutateAsync(id);
    navigate('/contacts', { replace: true });
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton variant="card" />
      </div>
    );
  }

  if (!contact) {
    return <div className="p-4 text-center text-gray-500 dark:text-gray-400">Contact not found</div>;
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="min-h-touch p-1">
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex-1">
          <h1 className="page-bg-text text-lg font-bold text-gray-900 dark:text-gray-100">{contact.full_name}</h1>
          {contact.role && <p className="text-sm text-gray-500 dark:text-gray-400">{contact.role}</p>}
        </div>
        <button onClick={() => navigate(`/contacts/${id}/edit`)} className="min-h-touch p-2 text-gray-500 dark:text-gray-400">
          <Edit2 className="h-5 w-5" />
        </button>
      </div>

      <Card className="mb-4">
        <div className="space-y-3">
          {contact.facility?.name && (
            <InfoRow label="Facility" value={contact.facility.name} />
          )}
          {contact.distributor?.name && (
            <InfoRow label="Distributor" value={contact.distributor.name} />
          )}
          {contact.phone && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400 dark:text-gray-500">Phone</span>
              <a href={`tel:${contact.phone}`} className="flex items-center gap-1 font-medium text-brand-800 dark:text-brand-400">
                <Phone className="h-3.5 w-3.5" />
                {contact.phone}
              </a>
            </div>
          )}
          {contact.email && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400 dark:text-gray-500">Email</span>
              <a href={`mailto:${contact.email}`} className="flex items-center gap-1 font-medium text-brand-800 dark:text-brand-400">
                <Mail className="h-3.5 w-3.5" />
                {contact.email}
              </a>
            </div>
          )}
          {contact.last_contacted_at && (
            <InfoRow label="Last Contacted" value={formatDate(contact.last_contacted_at)} />
          )}
        </div>
      </Card>

      {contact.notes && (
        <Card className="mb-4">
          <h3 className="mb-1 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Notes</h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{contact.notes}</p>
        </Card>
      )}

      <Card className="mb-4">
        <h3 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Communications</h3>
        <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">Communication history coming soon</p>
      </Card>

      {user?.role === 'owner' && !contact.is_archived && (
        <Button
          variant="outline"
          fullWidth
          className="text-red-500"
          onClick={() => setShowArchive(true)}
        >
          <Archive className="h-4 w-4" />
          Archive Contact
        </Button>
      )}

      <ConfirmDialog
        isOpen={showArchive}
        onClose={() => setShowArchive(false)}
        onConfirm={handleArchive}
        title="Archive Contact"
        message={`Archive ${contact.full_name}? They will be moved to the Archived view.`}
        confirmLabel="Archive"
      />
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="font-medium text-gray-700 dark:text-gray-300">{value || '—'}</span>
    </div>
  );
}
