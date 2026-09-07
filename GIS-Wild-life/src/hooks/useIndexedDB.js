import { useState, useEffect, useCallback } from 'react';

let DB = null;

function initDB() {
  return new Promise((res, rej) => {
    if (DB) return res(DB);
    const q = indexedDB.open("videogis", 1);
    q.onupgradeneeded = () => {
      q.result.createObjectStore("projects", { keyPath: "id" });
    };
    q.onsuccess = () => {
      DB = q.result;
      res(DB);
    };
    q.onerror = () => {
      rej(q.error);
    };
  });
}

export function useIndexedDB() {
  const idbAll = useCallback(() => {
    return initDB().then(db => {
      return new Promise((res, rej) => {
        const t = db.transaction("projects", "readonly").objectStore("projects").getAll();
        t.onsuccess = () => { res(t.result || []); };
        t.onerror = () => { rej(t.error); };
      });
    });
  }, []);

  const idbPut = useCallback((p) => {
    return initDB().then(db => {
      return new Promise((res, rej) => {
        const t = db.transaction("projects", "readwrite").objectStore("projects").put(p);
        t.onsuccess = () => { res(); };
        t.onerror = () => { rej(t.error); };
      });
    });
  }, []);

  const idbDel = useCallback((id) => {
    return initDB().then(db => {
      return new Promise((res, rej) => {
        const t = db.transaction("projects", "readwrite").objectStore("projects").delete(id);
        t.onsuccess = () => { res(); };
        t.onerror = () => { rej(t.error); };
      });
    });
  }, []);

  const idbGet = useCallback((id) => {
    return initDB().then(db => {
      return new Promise((res, rej) => {
        const t = db.transaction("projects", "readonly").objectStore("projects").get(id);
        t.onsuccess = () => { res(t.result); };
        t.onerror = () => { rej(t.error); };
      });
    });
  }, []);

  return { idbAll, idbPut, idbDel, idbGet };
}
