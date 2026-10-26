import { useState } from "react";

import { getApiErrorMessage } from "../api/client";
import { periodsApi } from "../api/endpoints";
import type { AcademicPeriod, PeriodInput } from "../api/types";
import { useFetch } from "./useFetch";

export function usePeriods() {
  const { data, isLoading, error, reload } = useFetch<AcademicPeriod[]>(async () => (await periodsApi.list()).data);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const create = async (input: PeriodInput) => {
    setMutationError(null);
    try {
      await periodsApi.create(input);
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
      await periodsApi.deactivate(id);
      await reload();
    } catch (requestError) {
      const message = getApiErrorMessage(requestError);
      setMutationError(message);
      throw new Error(message);
    }
  };

  return { periods: data ?? [], isLoading, error: mutationError ?? error, create, deactivate, reload };
}
