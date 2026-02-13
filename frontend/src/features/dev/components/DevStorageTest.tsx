'use client';
import { useState } from 'react';
import { ref, uploadBytes } from 'firebase/storage';
import { storage } from '@/services/firebase';

export default function DevStorageTest() {
  const [msg, setMsg] = useState('');
  async function run() {
    try {
      if (!storage) throw new Error('storage is null');
      const r = ref(storage, `dev-check/${Date.now()}.txt`);
      await uploadBytes(r, new Blob(['hello-from-emulator']));
      setMsg(`OK → ${r.fullPath}`);
    } catch (e:any) {
      console.error(e);
      setMsg(`FAIL → ${e?.message || e}`);
    }
  }
  return <button onClick={run}>Run Storage Smoke Test {msg && `— ${msg}`}</button>;
}
