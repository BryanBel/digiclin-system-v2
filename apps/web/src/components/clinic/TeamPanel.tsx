import { useCallback, useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { errorMessage } from '@/lib/errors';
import { authCall, FormAlert, useAction } from '@/components/forms/form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Dueño',
  admin: 'Socio',
  doctor: 'Médico',
};

interface MemberRow {
  id: string;
  role: string;
  user: { name: string; email: string };
}

interface InvitationRow {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string | Date;
}

const roleBadges = (role: string) =>
  role.split(',').map((r) => (
    <Badge key={r} variant="secondary">
      {ROLE_LABELS[r.trim()] ?? r}
    </Badge>
  ));

type Team = { members: MemberRow[]; invitations: InvitationRow[] } | { error: string };

async function fetchTeam(): Promise<Team> {
  const [membersResult, invitationsResult] = await Promise.all([
    authClient.organization.listMembers(),
    authClient.organization.listInvitations(),
  ]);
  if (membersResult.error) return { error: errorMessage(membersResult.error) };
  return {
    members: (membersResult.data?.members ?? []) as MemberRow[],
    invitations: ((invitationsResult.data ?? []) as InvitationRow[]).filter(
      (i) => i.status === 'pending',
    ),
  };
}

/** Miembros e invitaciones pendientes de la clinica activa (endpoints de Better Auth). */
export function TeamPanel({ roles }: { roles: Array<'owner' | 'admin' | 'doctor'> }) {
  const { pending, error, run } = useAction();
  const [team, setTeam] = useState<Team | null>(null);

  const reload = useCallback(() => fetchTeam().then(setTeam), []);

  useEffect(() => {
    let active = true;
    const refresh = () => fetchTeam().then((next) => active && setTeam(next));
    void refresh();
    window.addEventListener('digiclin:team-changed', refresh);
    return () => {
      active = false;
      window.removeEventListener('digiclin:team-changed', refresh);
    };
  }, []);

  const cancel = (invitationId: string) =>
    run(async () => {
      await authCall(authClient.organization.cancelInvitation({ invitationId }));
      await reload();
    });

  if (team && 'error' in team) return <FormAlert>{team.error}</FormAlert>;
  const { members = null, invitations = [] } = team ?? {};
  if (!members) return <p className="text-muted-foreground">Cargando el equipo…</p>;

  const filtered = members.filter((m) =>
    m.role.split(',').some((r) => roles.includes(r.trim() as never)),
  );
  const pendingInvites = invitations.filter((i) => roles.includes(i.role as never));

  return (
    <div className="grid gap-6">
      <section>
        <h3 className="font-medium">Miembros</h3>
        {filtered.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Todavía no hay nadie.</p>
        ) : (
          <ul className="mt-2 divide-y rounded-lg border">
            {filtered.map((member) => (
              <li
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{member.user.name}</p>
                  <p className="text-sm text-muted-foreground">{member.user.email}</p>
                </div>
                <div className="flex gap-1">{roleBadges(member.role)}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="font-medium">Invitaciones pendientes</h3>
        {pendingInvites.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No hay invitaciones pendientes.</p>
        ) : (
          <ul className="mt-2 divide-y rounded-lg border">
            {pendingInvites.map((invitation) => (
              <li
                key={invitation.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{invitation.email}</p>
                  <p className="text-sm text-muted-foreground">
                    Vence el {new Date(invitation.expiresAt).toLocaleDateString('es')}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => cancel(invitation.id)}
                >
                  Cancelar
                </Button>
              </li>
            ))}
          </ul>
        )}
        {error && (
          <div className="mt-2">
            <FormAlert>{error}</FormAlert>
          </div>
        )}
      </section>
    </div>
  );
}
