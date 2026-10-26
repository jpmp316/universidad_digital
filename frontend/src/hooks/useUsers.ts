import { useState } from "react";

import { getApiErrorMessage } from "../api/client";
import { usersApi } from "../api/endpoints";
import type { User, UserCreateInput, UserUpdateInput } from "../api/types";
import { useFetch } from "./useFetch";

export function useUsers(enabled = true) {
  const { data, isLoading, error, reload } = useFetch<User[]>(async () => (enabled ? (await usersApi.list()).data : []), [enabled]);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const create = async (input: UserCreateInput) => {
    setMutationError(null);
    try {
      await usersApi.create(input);
      await reload();
    } catch (requestError) {
      const message = getApiErrorMessage(requestError);
      setMutationError(message);
      throw new Error(message);
    }
  };

  const update = async (id: string, input: UserUpdateInput) => {
    setMutationError(null);
    try {
      await usersApi.update(id, input);
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
      await usersApi.deactivate(id);
      await reload();
    } catch (requestError) {
      const message = getApiErrorMessage(requestError);
      setMutationError(message);
      throw new Error(message);
    }
  };

  return { users: data ?? [], isLoading, error: mutationError ?? error, create, update, deactivate, reload };
}
