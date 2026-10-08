"use client";

import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { APP_TODAY } from "@/lib/app-date";
import { requestShortfall, validateMovement } from "@/lib/inventory";
import { inventoryItems, stockMovements, stores, uniformRequests } from "@/lib/inventory-seed";
import type { InventoryItem, StockMovement, Store, UniformRequest, UniformRequestStatus } from "@/types/domain";
import { usePersistedState } from "./use-persisted-state";

type InventoryState = { items: InventoryItem[]; movements: StockMovement[]; requests: UniformRequest[] };

/** A movement before it gets an id. */
export type NewMovement = Omit<StockMovement, "id">;

type InventoryValue = InventoryState & {
  stores: Store[];
  ready: boolean;
  /** Validates every movement against the ledger (in order) and posts all or none. Returns an error message or null. */
  post: (movements: NewMovement | NewMovement[]) => string | null;
  upsertItem: (item: InventoryItem) => void;
  addRequest: (request: Omit<UniformRequest, "id" | "history" | "status">, by: string) => void;
  /** Moves a request on. Dispatching issues the stock from the request's store and fails when it is short. */
  setRequestStatus: (id: string, status: UniformRequestStatus, by: string, rejectReason?: string) => string | null;
};

const InventoryContext = createContext<InventoryValue | null>(null);

const seed: InventoryState = { items: inventoryItems, movements: stockMovements, requests: uniformRequests };
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

/** Stock items, the movement ledger and uniform requests, shared by the inventory pages and the guard app. */
export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [state, setState, ready] = usePersistedState<InventoryState>("bmg-inventory-v1", seed);
  // Mirrors the latest state so actions can validate synchronously and return an error.
  const latest = useRef(state);
  useEffect(() => { latest.current = state; }, [state]);

  const value = useMemo<InventoryValue>(() => {
    const commit = (next: InventoryState) => { latest.current = next; setState(next); };

    const post: InventoryValue["post"] = input => {
      const list = Array.isArray(input) ? input : [input];
      const ledger = [...latest.current.movements];
      for (const draft of list) {
        const movement = { ...draft, id: newId("MV") };
        const error = validateMovement(ledger, movement, latest.current.items);
        if (error) return error;
        ledger.push(movement);
      }
      commit({ ...latest.current, movements: ledger });
      return null;
    };

    const setRequestStatus: InventoryValue["setRequestStatus"] = (id, status, by, rejectReason) => {
      const request = latest.current.requests.find(item => item.id === id);
      if (!request) return "Request not found.";
      if (status === "rejected" && !rejectReason?.trim()) return "Give a reason for rejecting.";
      if (status === "dispatched") {
        const short = requestShortfall(latest.current.movements, request);
        if (short.length) {
          const names = short.map(line => `${latest.current.items.find(item => item.id === line.itemId)?.name ?? line.itemId} ${line.size} (need ${line.need}, have ${line.have})`);
          return `Not enough stock: ${names.join(", ")}.`;
        }
        const error = post(request.items.map(line => ({ date: APP_TODAY, type: "issue", itemId: line.itemId, size: line.size, qty: line.qty, storeId: request.storeId, employeeId: request.employeeId, requestId: request.id, by })));
        if (error) return error;
      }
      const updated: UniformRequest = { ...request, status, rejectReason: status === "rejected" ? rejectReason : request.rejectReason, history: [...request.history, { status, on: APP_TODAY, by }] };
      commit({ ...latest.current, requests: latest.current.requests.map(item => item.id === id ? updated : item) });
      return null;
    };

    return {
      ...state,
      stores,
      ready,
      post,
      setRequestStatus,
      upsertItem: item => commit({ ...latest.current, items: latest.current.items.some(entry => entry.id === item.id) ? latest.current.items.map(entry => entry.id === item.id ? item : entry) : [...latest.current.items, item] }),
      addRequest: (request, by) => commit({
        ...latest.current,
        requests: [{ ...request, id: newId("UR"), status: "requested", history: [{ status: "requested", on: request.requestedOn, by }] }, ...latest.current.requests],
      }),
    };
  }, [state, ready, setState]);

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const value = useContext(InventoryContext);
  if (!value) throw new Error("useInventory must be used inside InventoryProvider");
  return value;
}
