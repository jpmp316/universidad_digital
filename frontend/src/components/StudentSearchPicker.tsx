import { useEffect, useRef, useState } from "react";
import { Search, UserRound, X } from "lucide-react";

import { usersApi } from "../api/endpoints";
import type { User } from "../api/types";
import { Button } from "./Button";

const PAGE_SIZE = 10;

interface StudentSearchPickerProps {
  selectedStudent: User | null;
  onSelect: (student: User | null) => void;
}

export function StudentSearchPicker({ selectedStudent, onSelect }: StudentSearchPickerProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const waitingForSearch = query.trim() !== debouncedQuery;

  useEffect(() => {
    const normalized = query.trim();
    if (!normalized) {
      setDebouncedQuery("");
      return;
    }
    const timeout = window.setTimeout(() => setDebouncedQuery(normalized), 250);
    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    if (selectedStudent || debouncedQuery.length < 2) {
      setResults([]);
      setHasMore(false);
      setIsLoading(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    void usersApi.list(0, PAGE_SIZE + 1, debouncedQuery, "student", true).then((response) => {
      if (requestId !== requestIdRef.current) return;
      setResults(response.data.slice(0, PAGE_SIZE));
      setHasMore(response.data.length > PAGE_SIZE);
    }).catch(() => {
      if (requestId === requestIdRef.current) setError("No se pudo buscar estudiantes. Inténtalo de nuevo.");
    }).finally(() => {
      if (requestId === requestIdRef.current) setIsLoading(false);
    });
    return () => {
      requestIdRef.current += 1;
    };
  }, [debouncedQuery, selectedStudent]);

  const loadMore = async () => {
    if (!hasMore || isLoadingMore) return;
    const requestId = ++requestIdRef.current;
    setIsLoadingMore(true);
    try {
      const response = await usersApi.list(results.length, PAGE_SIZE + 1, debouncedQuery, "student", true);
      if (requestId !== requestIdRef.current) return;
      setResults((current) => [...current, ...response.data.slice(0, PAGE_SIZE)]);
      setHasMore(response.data.length > PAGE_SIZE);
    } catch {
      if (requestId === requestIdRef.current) setError("No se pudieron cargar más coincidencias.");
    } finally {
      if (requestId === requestIdRef.current) setIsLoadingMore(false);
    }
  };

  const clearSelection = () => {
    onSelect(null);
    setQuery("");
  };

  return (
    <div className="student-search-picker">
      <label htmlFor="admin-student-search">Buscar estudiante por nombre o correo</label>
      {selectedStudent ? <div className="selected-student-chip"><span className="student-picker-icon"><UserRound size={16} /></span><span><strong>{selectedStudent.full_name}</strong><small>{selectedStudent.email}</small></span><Button aria-label="Cambiar estudiante seleccionado" onClick={clearSelection} type="button" variant="ghost"><X size={15} />Cambiar</Button></div> : <>
        <div className="student-search-field"><Search aria-hidden="true" size={16} /><input autoComplete="off" id="admin-student-search" onChange={(event) => { setQuery(event.target.value); onSelect(null); }} placeholder="Escribe al menos 2 caracteres" type="search" value={query} /></div>
        {query.trim().length === 1 ? <small className="picker-hint">Escribe al menos 2 caracteres para iniciar la búsqueda.</small> : null}
        {waitingForSearch || isLoading ? <div className="picker-status" role="status">Buscando estudiantes…</div> : null}
        {!waitingForSearch && !isLoading && debouncedQuery.length >= 2 && results.length === 0 && !error ? <div className="picker-status">No hay estudiantes que coincidan con “{debouncedQuery}”.</div> : null}
        {error ? <div className="picker-error" role="alert">{error}</div> : null}
        {results.length > 0 && !waitingForSearch ? <div aria-label="Resultados de estudiantes" className="student-search-results" role="listbox">{results.map((student) => <button aria-selected="false" className="student-search-result" key={student.id} onClick={() => { onSelect(student); setQuery(""); }} role="option" type="button"><span className="roster-avatar" aria-hidden="true">{student.full_name.charAt(0).toLocaleUpperCase()}</span><span><strong>{student.full_name}</strong><small>{student.email}</small></span></button>)}{hasMore ? <Button disabled={isLoadingMore} isLoading={isLoadingMore} onClick={() => void loadMore()} type="button" variant="ghost">Ver más coincidencias</Button> : null}</div> : null}
      </>}
    </div>
  );
}
