import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, Phone, Mail } from 'lucide-react';
import { useContact, useDeleteContact } from '@/hooks/useContacts';
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
  const deleteContact = useDeleteContact();
  const [showDelete, setShowDelete] = useState(false);

  async function handleDelete() {
    await deleteContact.mutateAsync(id);
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
    return <div className="p-4 text-center text-gray-500">Contact not found</div>;
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="min-h-touch p-1">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">{contact.full_name}</h1>
          {contact.role && <p className="text-sm text-gray-500">{contact.role}</p>}
        </div>
        <button onClick={() => navigate(`/contacts/${id}/edit`)} className="min-h-touch p-2 text-gray-500">
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
              <span className="text-gray-400">Phone</span>
              <a href={`tel:${contact.phone}`} className="flex items-center gap-1 font-medium text-brand-800">
                <Phone className="h-3.5 w-3.5" />
                {contact.phone}
              </a>
            </div>
          )}
          {contact.email && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Email</span>
              <a href={`mailto:${contact.email}`} className="flex items-center gap-1 font-medium text-brand-800">
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
          <h3 className="mb-1 text-xs font-semibold uppercase text-gray-400">Notes</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{contact.notes}</p>
        </Card>
      )}

      <Card className="mb-4">
        <h3 className="text-xs font-semibold uppercase text-gray-400">Communications</h3>
        <p className="mt-1 text-sm text-gray-400">Communication history coming soon</p>
      </Card>

      {user?.role === 'owner' && (
        <Button
          variant="outline"
          fullWidth
          className="text-red-500"
          onClick={() => setShowDelete(true)}
        >
          <Trash2 className="h-4 w-4" />
          Delete Contact
        </Button>
      )}

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Contact"
        message={`Delete ${contact.full_name}? This cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium text-gray-700">{value || '—'}</span>
    </div>
  );
}
