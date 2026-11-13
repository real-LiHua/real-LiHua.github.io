# Storage, identity devices, and Serverless

All Telegram storage APIs are asynchronous and callback-based. Wrap them once instead of
writing nested callbacks at every call site.

```ts
function call<T>(fn: (cb: (err: Error | null, value?: T) => void) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    fn((err, value) => (err ? reject(err) : resolve(value as T)));
  });
}
```

## CloudStorage (Bot API 6.9+)

Per-bot, per-user, synced across the user's devices. Not encrypted: the bot's backend can
read it, so do not put secrets here.

Limits: 1,024 keys per bot per user; key 1–128 chars (`A-Z`, `a-z`, `0-9`, `_`, `-`);
value 0–4,096 chars.

| Method | Callback |
|---|---|
| `setItem(key, value[, cb])` | `(err, stored: boolean)` |
| `getItem(key, cb)` | `(err, value: string)` |
| `getItems(keys, cb)` | `(err, values: Record<string, string>)` |
| `removeItem(key[, cb])` | `(err, removed: boolean)` |
| `removeItems(keys[, cb])` | `(err, removed: boolean)` |
| `getKeys(cb)` | `(err, keys: string[])` |

```ts
const { CloudStorage } = Telegram.WebApp;

await call<string>((cb) => CloudStorage.getItem('draft', cb));
await call<boolean>((cb) => CloudStorage.setItem('draft', JSON.stringify(draft), cb));
const all = await call<Record<string, string>>((cb) =>
  CloudStorage.getItems(['draft', 'lastTab'], cb),
);
```

CloudStorage is for small state that must follow the user between devices: preferences,
last tab, compact drafts. For large data use `DeviceStorage`; for sensitive items use
`SecureStorage`.

## DeviceStorage (Bot API 9.0+)

Local persistent storage on the user's device, conceptually `localStorage` but scoped to
the bot and available inside Telegram's WebView. Up to **5 MB per bot per user**.

| Method | Callback |
|---|---|
| `setItem(key, value[, cb])` | `(err, stored: boolean)` |
| `getItem(key, cb)` | `(err, value: string)` |
| `removeItem(key[, cb])` | `(err, removed: boolean)` |
| `clear([cb])` | `(err, cleared: boolean)` |

Use it for caches, offline copies, media metadata, and large UI state. It is local, so it
does not sync and disappears if the user clears Telegram data or changes device.

## SecureStorage (Bot API 9.0+)

Encrypted at rest — iOS Keychain, Android Keystore. Up to **10 items per bot per user**.

| Method | Callback |
|---|---|
| `setItem(key, value[, cb])` | `(err, stored: boolean)` |
| `getItem(key, cb)` | `(err, value, canRestore: boolean)` |
| `restoreItem(key[, cb])` | `(err, value)`; prompts the user to restore from iCloud/backup |
| `removeItem(key[, cb])` | `(err, removed: boolean)` |
| `clear([cb])` | `(err, cleared: boolean)` |

Use it for refresh tokens, session keys, and biometric tokens. Ten items is small: store
one session blob rather than one key per field. If `getItem` returns `canRestore = true`,
offer `restoreItem` instead of silently logging the user out.

## BiometricManager (Bot API 7.2+)

Call `init()` before reading any field.

| Field | Notes |
|---|---|
| `isInited` | Init complete. |
| `isBiometricAvailable` | Hardware and enrollment available. |
| `biometricType` | `finger`, `face`, `unknown`. |
| `isAccessRequested` | Permission was requested before. |
| `isAccessGranted` | Permission granted. |
| `isBiometricTokenSaved` | Token stored on this device. |
| `deviceId` | Stable device identifier; bind tokens to it. |

| Method | Callback |
|---|---|
| `init([cb])` | none |
| `requestAccess({ reason }[, cb])` | `(granted: boolean)` |
| `authenticate({ reason }[, cb])` | `(ok: boolean, token?: string)` |
| `updateBiometricToken(token[, cb])` | `(updated: boolean)`; empty string removes |
| `openSettings()` | User gesture only; opens system biometric settings |

```ts
const bm = Telegram.WebApp.BiometricManager;

await new Promise<void>((resolve) => bm.init(() => resolve()));
if (!bm.isBiometricAvailable) return;

if (!bm.isAccessGranted) {
  const granted = await new Promise<boolean>((resolve) =>
    bm.requestAccess({ reason: 'Unlock your account' }, resolve),
  );
  if (!granted) return;
}

bm.authenticate({ reason: 'Confirm payment' }, async (ok, token) => {
  if (!ok) return;
  // Send token + deviceId to the server for verification.
});
```

Biometric auth proves presence to the **client**; treat the returned token as a secret and
verify the session server-side. Do not use biometric success alone to authorize payments
without a server-issued challenge.

## Motion sensors (Bot API 8.0+)

Accelerometer, gyroscope, and device orientation share a start/stop shape:

```ts
const { Accelerometer, Gyroscope, DeviceOrientation } = Telegram.WebApp;

Accelerometer.start({ refresh_rate: 100 }, (ok) => {
  if (!ok) return; // unsupported
});
Accelerometer.onEvent('accelerometerChanged', () => {
  use(Accelerometer.x, Accelerometer.y, Accelerometer.z);
});
Accelerometer.stop();

Gyroscope.start({ refresh_rate: 100 });
DeviceOrientation.start({ refresh_rate: 100, need_absolute: true });
```

| Object | Fields | Start params |
|---|---|---|
| `Accelerometer` | `isStarted`, `x`, `y`, `z` (m/s²) | `refresh_rate` 20–1000 ms, default 1000 |
| `Gyroscope` | `isStarted`, `x`, `y`, `z` (rad/s) | `refresh_rate` 20–1000 ms |
| `DeviceOrientation` | `isStarted`, `absolute`, `alpha`, `beta`, `gamma` (radians) | `refresh_rate`, `need_absolute` (default `false`) |

Events: `<name>Started`, `<name>Stopped`, `<name>Changed`, `<name>Failed` with
`error: 'UNSUPPORTED'`. Values are read from the object, not the event payload. Always
stop sensors when the screen is hidden (`deactivated`) to protect battery; the client may
not do it for you.

`DeviceOrientation.absolute` tells you whether the client actually supplied absolute data,
even when `need_absolute: true` was requested.

## LocationManager (Bot API 8.0+)

Call `init()` before use.

| Field | Notes |
|---|---|
| `isInited`, `isLocationAvailable` | Availability state. |
| `isAccessRequested`, `isAccessGranted` | Permission state. |

| Method | Callback |
|---|---|
| `init([cb])` | none |
| `getLocation(cb)` | `(locationData \| null)`; null when access is denied |
| `openSettings()` | User gesture only |

### LocationData

`latitude`, `longitude` (degrees), `altitude` (m), `course` (degrees), `speed` (m/s),
`horizontal_accuracy`, `vertical_accuracy`, `course_accuracy`, `speed_accuracy`.
Optional values are `null` when the device cannot provide them.

```ts
const lm = Telegram.WebApp.LocationManager;
await new Promise<void>((resolve) => lm.init(() => resolve()));
if (!lm.isLocationAvailable) return;

lm.getLocation((data) => {
  if (!data) return; // denied
  map.setView([data.latitude, data.longitude], 16);
});
```

Location is sensitive: request it only when the user triggers a location feature, explain
why, and send it to the server only when needed. `openSettings()` is the recovery path when
permission was denied permanently.

## Serverless (Telegram Serverless)

`Serverless.call(name[, input][, callback])` invokes a bot endpoint. The platform attaches
and validates `initData`, so the endpoint knows the caller.

```ts
Telegram.WebApp.Serverless.call('getProfile', { lang: 'en' }, (error, profile) => {
  if (error) {
    console.error(error.message, error.type, error.status);
    return;
  }
  render(profile);
});
```

Error object fields: `message`, optional `type` (`ENDPOINT_ERROR`, `UNAUTHORIZED`, …),
`status` (HTTP status or `0`), optional `parameters` from `EndpointError`.

Serverless is only available when the Mini App is hosted on Telegram Serverless; it is not
a generic backend proxy.

## Choosing storage

| Need | Use |
|---|---|
| Preference that follows the user across devices | `CloudStorage` |
| Large local cache or offline data | `DeviceStorage` |
| Token or secret | `SecureStorage` (server-issued, short-lived) |
| Non-critical UI state during a session | In-memory store |
| Anything security-critical | Server database, keyed by validated `user.id` |

Never treat client storage as authoritative for entitlements, balances, or identity. The
client can be modified; the server cannot.
