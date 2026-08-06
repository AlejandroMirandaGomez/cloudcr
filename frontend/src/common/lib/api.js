const BASE = import.meta.env.VITE_API_URL || '/api';

async function request(method, path, body) {
  const init = {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  };
  if (body !== undefined) init.body = JSON.stringify(body);

  const res = await fetch(BASE + path, init);

  if (res.status === 204) return null;

  const json = await res.json();

  if (!res.ok) {
    const mensaje = json?.error?.mensaje ?? `Error ${res.status}`;
    throw new Error(mensaje);
  }

  return json.data;
}

export const api = {
  get:    (path)        => request('GET',    path),
  post:   (path, body)  => request('POST',   path, body),
  put:    (path, body)  => request('PUT',    path, body),
  delete: (path)        => request('DELETE', path),
};
