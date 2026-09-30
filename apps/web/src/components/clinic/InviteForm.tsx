import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { authCall, Field, FormAlert, SubmitButton, text, useAction } from '@/components/forms/form';
import { Input } from '@/components/ui/input';

/** Invita a la clinica activa. La API decide quien puede invitar a quien (solo el dueno invita socios). */
export function InviteForm({ role, cta }: { role: 'doctor' | 'admin'; cta: string }) {
  const { pending, error, run } = useAction();
  const [sentTo, setSentTo] = useState<string | null>(null);

  const onSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const email = text(new FormData(formElement), 'email');
    return run(async () => {
      // El cliente solo conoce los roles por defecto de Better Auth; "doctor" es nuestro y la
      // API lo valida (y decide quien puede invitar con cada rol).
      await authCall(authClient.organization.inviteMember({ email, role: role as 'admin' }));
      formElement.reset();
      setSentTo(email);
      window.dispatchEvent(new Event('digiclin:team-changed'));
    });
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <Field label="Correo de la persona" hint="Le llegará un enlace válido por 7 días.">
        {(props) => <Input {...props} name="email" type="email" autoComplete="off" required />}
      </Field>
      {error && <FormAlert>{error}</FormAlert>}
      {sentTo && <FormAlert tone="ok">Invitación enviada a {sentTo}.</FormAlert>}
      <SubmitButton pending={pending}>{cta}</SubmitButton>
    </form>
  );
}
