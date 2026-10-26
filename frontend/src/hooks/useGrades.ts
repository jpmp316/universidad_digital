import { useState } from "react";

import { getApiErrorMessage } from "../api/client";
import { gradesApi } from "../api/endpoints";
import type { Grade } from "../api/types";
import { useFetch } from "./useFetch";

export function useGrades(enrollmentId?: string) {
  const { data, isLoading, error, reload } = useFetch<Grade[]>(
    async () => (enrollmentId ? (await gradesApi.list(enrollmentId)).data : []),
    [enrollmentId],
  );
  const [mutationError, setMutationError] = useState<string | null>(null);

  const create = async (input: { enrollment_id: string; assessment_name: string; value: number }) => {
    setMutationError(null);
    try {
      await gradesApi.create(input);
      await reload();
    } catch (requestError) {
      const message = getApiErrorMessage(requestError);
      setMutationError(message);
      throw new Error(message);
    }
  };

  const update = async (gradeId: string, value: number) => {
    setMutationError(null);
    try {
      await gradesApi.update(gradeId, value);
      await reload();
    } catch (requestError) {
      const message = getApiErrorMessage(requestError);
      setMutationError(message);
      throw new Error(message);
    }
  };

  return { grades: data ?? [], isLoading, error: mutationError ?? error, create, update, reload };
}
