import { useState } from "react";

import { getApiErrorMessage } from "../api/client";
import { subjectsApi } from "../api/endpoints";
import type { Subject, SubjectInput } from "../api/types";
import { useFetch } from "./useFetch";

export function useSubjects() {
  const { data, isLoading, error, reload } = useFetch<Subject[]>(async () => (await subjectsApi.list()).data);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const create = async (input: SubjectInput) => {
    setMutationError(null);
    try {
      await subjectsApi.create(input);
      await reload();
    } catch (requestError) {
      const message = getApiErrorMessage(requestError);
      setMutationError(message);
      throw new Error(message);
    }
  };

  const deactivate = async (id: string) => {
    setMutationError(null);
    try {
      await subjectsApi.deactivate(id);
      await reload();
    } catch (requestError) {
      const message = getApiErrorMessage(requestError);
      setMutationError(message);
      throw new Error(message);
    }
  };

  return { subjects: data ?? [], isLoading, error: mutationError ?? error, create, deactivate, reload };
}
