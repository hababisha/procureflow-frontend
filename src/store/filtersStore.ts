import { create } from "zustand";

interface FiltersState {
  startDate: string;
  endDate: string;
  departmentId: string;
  supplierId: string;
  status: string;
  setStartDate: (startDate: string) => void;
  setEndDate: (endDate: string) => void;
  setDepartmentId: (departmentId: string) => void;
  setSupplierId: (supplierId: string) => void;
  setStatus: (status: string) => void;
  resetFilters: () => void;
}

const getDefaultDates = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), 0, 1);
  return {
    startDate: firstDay.toISOString().split("T")[0],
    endDate: now.toISOString().split("T")[0],
  };
};

const defaults = getDefaultDates();

export const useFiltersStore = create<FiltersState>((set) => ({
  startDate: defaults.startDate,
  endDate: defaults.endDate,
  departmentId: "",
  supplierId: "",
  status: "",
  setStartDate: (startDate) => set({ startDate }),
  setEndDate: (endDate) => set({ endDate }),
  setDepartmentId: (departmentId) => set({ departmentId }),
  setSupplierId: (supplierId) => set({ supplierId }),
  setStatus: (status) => set({ status }),
  resetFilters: () =>
    set({
      ...getDefaultDates(),
      departmentId: "",
      supplierId: "",
      status: "",
    }),
}));
