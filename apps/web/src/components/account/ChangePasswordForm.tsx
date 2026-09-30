import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import {
  authCall,
  Field,
  FormAlert,
  PasswordInput,
  SubmitButton,
  useAction,
} from '@/components/forms/form';

export function ChangePasswordForm() {
  const { pending, error, setError, run } = useAction();
  const [done, setDone] = useState(false);

  const onSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const currentPassword = String(form.get('current') ?? '');
    const newPassword = String(form.get('password') ?? '');
    if (newPassword.length < 12)
      return setError('La contraseña nueva debe tener al menos 12 caracteres.');
    if (newPassword !== form.get('confirm'))
      return setError('Las contraseñas nuevas no coinciden.');

    return run(async () => {
      await authCall(
        authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true }),
      );
      formElement.reset();
      setDone(true);
    });
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <Field label="Contraseña actual">
        {(props) => (
          <PasswordInput {...props} name="current" autoComplete="current-password" required />
        )}
      </Field>
      <Field label="Contraseña nueva" hint="Mínimo 12 caracteres.">
        {(props) => (
          <PasswordInput {...props} name="password" autoComplete="new-password" required />
        )}
      </Field>
      <Field label="Repite la contraseña nueva">
        {(props) => (
          <PasswordInput {...props} name="confirm" autoComplete="new-password" required />
        )}
      </Field>
      {error && <FormAlert>{error}</FormAlert>}
      {done && (
        <FormAlert tone="ok">
          Contraseña actualizada. Se cerraron tus sesiones en otros dispositivos.
        </FormAlert>
      )}
      <SubmitButton pending={pending}>Cambiar contraseña</SubmitButton>
    </form>
  );
}
