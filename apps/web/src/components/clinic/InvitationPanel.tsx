import { useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { errorMessage } from '@/lib/errors';
import { authCall, FormAlert, useAction } from '@/components/forms/form';
import { Button } from '@/components/ui/button';

const ROLE_LABELS: Record<string, string> = {
  admin: 'socio directivo',
  doctor: 'médico',
};

interface InvitationView {
  organizationName: string;
  role: string;
  inviterEmail: string;
  status: string;
}

export function InvitationPanel({ id }: { id: string }) {
  const { pending, error, run } = useAction();
  const [invitation, setInvitation] = useState<InvitationView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rejected, setRejected] = useState(false);

  useEffect(() => {
    authClient.organization.getInvitation({ query: { id } }).then(({ data, error: authError }) => {
      if (authError || !data) setLoadError(errorMessage(authError));
      else setInvitation(data as InvitationView);
    });
  }, [id]);

  if (loadError) return <FormAlert>{loadError}</FormAlert>;
  if (!invitation) return <p className="text-muted-foreground">Cargando la invitación…</p>;
  if (rejected) return <FormAlert tone="ok">Rechazaste la invitación.</FormAlert>;
  if (invitation.status !== 'pending') {
    return <FormAlert>Esta invitación ya fue respondida o cancelada.</FormAlert>;
  }

  const accept = () =>
    run(async () => {
      await authCall(authClient.organization.acceptInvitation({ invitationId: id }));
      window.location.assign(invitation.role === 'doctor' ? '/medico' : '/admin');
    });

  const reject = () =>
    run(async () => {
      await authCall(authClient.organization.rejectInvitation({ invitationId: id }));
      setRejected(true);
    });

  return (
    <div className="grid gap-4">
      <p>
        <strong>{invitation.inviterEmail}</strong> te invitó a unirte a{' '}
        <strong>{invitation.organizationName}</strong> como{' '}
        <strong>{ROLE_LABELS[invitation.role] ?? invitation.role}</strong>.
      </p>
      {invitation.role === 'doctor' && (
        <p className="text-sm text-muted-foreground">
          Al aceptar quedas habilitado como médico de la clínica. Después completa tu especialidad y
          tus registros profesionales en tu perfil.
        </p>
      )}
      {error && <FormAlert>{error}</FormAlert>}
      <div className="flex flex-wrap gap-2">
        <Button size="lg" onClick={accept} disabled={pending}>
          Aceptar invitación
        </Button>
        <Button size="lg" variant="outline" onClick={reject} disabled={pending}>
          Rechazar
        </Button>
      </div>
    </div>
  );
}
