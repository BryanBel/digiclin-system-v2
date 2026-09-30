import { useState } from 'react';
import { renderSVG } from 'uqr';
import { authClient } from '@/lib/auth-client';
import { errorMessage } from '@/lib/errors';
import {
  authCall,
  Field,
  FormAlert,
  PasswordInput,
  SubmitButton,
  text,
  useAction,
  UserFacingError,
} from '@/components/forms/form';
import { Input } from '@/components/ui/input';

interface Enrollment {
  totpURI: string;
  backupCodes: string[];
}

/** Clave para escribir a mano si no se puede escanear el QR. */
function manualKey(totpURI: string) {
  const secret = new URL(totpURI).searchParams.get('secret') ?? '';
  return secret.replace(/(.{4})/g, '$1 ').trim();
}

export function TwoFactorSettings({ enabled }: { enabled: boolean }) {
  const { pending, error, run } = useAction();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);

  const start = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get('password') ?? '');
    return run(async () => {
      const result = await authCall(authClient.twoFactor.enable({ password }));
      // DigiClin usa TOTP (aplicacion de autenticacion); la variante OTP por correo no aplica.
      if (!result || !('totpURI' in result)) throw new UserFacingError(errorMessage(null));
      setEnrollment(result);
    });
  };

  const confirm = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = text(new FormData(event.currentTarget), 'code').replace(/\s/g, '');
    return run(async () => {
      await authCall(authClient.twoFactor.verifyTotp({ code }));
      window.location.reload();
    });
  };

  const disable = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get('password') ?? '');
    return run(async () => {
      await authCall(authClient.twoFactor.disable({ password }));
      window.location.reload();
    });
  };

  if (enabled) {
    return (
      <form onSubmit={disable} className="grid gap-4" noValidate>
        <FormAlert tone="ok">La verificación en dos pasos está activada.</FormAlert>
        <Field label="Tu contraseña, para desactivarla">
          {(props) => (
            <PasswordInput {...props} name="password" autoComplete="current-password" required />
          )}
        </Field>
        {error && <FormAlert>{error}</FormAlert>}
        <SubmitButton pending={pending}>Desactivar verificación en dos pasos</SubmitButton>
      </form>
    );
  }

  if (enrollment) {
    return (
      <div className="grid gap-5">
        <ol className="grid list-decimal gap-2 pl-5 text-sm">
          <li>
            Abre tu aplicación de autenticación (Google Authenticator, Microsoft Authenticator u
            otra compatible con TOTP) y escanea el código.
          </li>
          <li>Escribe el código de 6 dígitos que aparece para confirmar.</li>
        </ol>
        <div
          className="mx-auto w-48 rounded-lg bg-white p-2"
          role="img"
          aria-label="Código QR para la aplicación de autenticación"
          // SVG generado localmente por uqr a partir de la URI de Better Auth: solo formas.
          dangerouslySetInnerHTML={{ __html: renderSVG(enrollment.totpURI) }}
        />
        <p className="text-sm text-muted-foreground">
          ¿No puedes escanear? Escribe esta clave:{' '}
          <code className="font-mono text-foreground">{manualKey(enrollment.totpURI)}</code>
        </p>

        <div className="rounded-lg border p-4">
          <p className="font-medium">Códigos de respaldo</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Guárdalos en un lugar seguro. Cada uno sirve una vez si pierdes el teléfono. No se
            vuelven a mostrar.
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-1 font-mono text-sm">
            {enrollment.backupCodes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
        </div>

        <form onSubmit={confirm} className="grid gap-4" noValidate>
          <Field label="Código de 6 dígitos">
            {(props) => (
              <Input
                {...props}
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
              />
            )}
          </Field>
          {error && <FormAlert>{error}</FormAlert>}
          <SubmitButton pending={pending}>Confirmar y activar</SubmitButton>
        </form>
      </div>
    );
  }

  return (
    <form onSubmit={start} className="grid gap-4" noValidate>
      <p className="text-sm text-muted-foreground">
        Además de tu contraseña, al entrar se te pedirá un código de tu teléfono. Es la mejor
        protección para una cuenta con acceso a historias clínicas.
      </p>
      <Field label="Tu contraseña, para empezar">
        {(props) => (
          <PasswordInput {...props} name="password" autoComplete="current-password" required />
        )}
      </Field>
      {error && <FormAlert>{error}</FormAlert>}
      <SubmitButton pending={pending}>Activar verificación en dos pasos</SubmitButton>
    </form>
  );
}
