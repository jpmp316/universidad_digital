import { useState } from "react";

import { getApiErrorMessage } from "../api/client";
import { enrollmentsApi } from "../api/endpoints";
import type { Enrollment } from "../api/types";
import { useFetch } from "./useFetch";

export function useEnrollments() {
  const { data, isLoading, error, reload } = useFetch<Enrollment[]>(async () => (await enrollmentsApi.list()).data);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const create = async (input: { student_id: string; subject_id: string; period_id: string }) => {
    setMutationError(null);
    try {
      await enrollmentsApi.create(input);
      await reload();
    } catch (requestError) {
      const message = getApiErrorMessage(requestError);
      setMutationError(message);
      throw new Error(message);
    }
  };

  const cancel = async (id: string) => {
    setMutationError(null);
    try {
      await enrollmentsApi.cancel(id);
      await reload();
    } catch (requestError) {
      const message = getApiErrorMessage(requestError);
      setMutationError(message);
      throw new Error(message);
    }
  };

  return { enrollments: data ?? [], isLoading, error: mutationError ?? error, create, cancel, reload };
}
