import { useState, useCallback } from 'react';
import {
  fetchLabPartners,
  fetchLabWorkOrders,
  fetchLabWorkOrder,
  fetchPatientLabWorkOrders,
  createLabWorkOrder,
  updateLabWorkOrder,
  changeLabWorkOrderStatus,
  deleteLabWorkOrder,
} from '../api';
import type {
  LabPartner,
  LabWorkOrder,
  LabWorkOrderInput,
  LabWorkOrderStatusChange,
} from '../../core/types';

export function useLabWorkOrders() {
  const [workOrders, setWorkOrders] = useState<LabWorkOrder[]>([]);
  const [partners, setPartners] = useState<LabPartner[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPartners = useCallback(async () => {
    try {
      setPartners(await fetchLabPartners());
    } catch {
      // silent
    }
  }, []);

  const loadWorkOrders = useCallback(async (filters?: { status?: string; patientId?: string; labPartnerId?: string }) => {
    setLoading(true);
    try {
      setWorkOrders(await fetchLabWorkOrders(filters));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPatientWorkOrders = useCallback(async (patientId: string) => {
    setLoading(true);
    try {
      setWorkOrders(await fetchPatientLabWorkOrders(patientId));
    } finally {
      setLoading(false);
    }
  }, []);

  const getWorkOrder = useCallback(async (workOrderId: string) => {
    return fetchLabWorkOrder(workOrderId);
  }, []);

  const create = useCallback(async (data: LabWorkOrderInput) => {
    return createLabWorkOrder(data);
  }, []);

  const update = useCallback(async (workOrderId: string, data: Partial<LabWorkOrderInput>) => {
    return updateLabWorkOrder(workOrderId, data);
  }, []);

  const changeStatus = useCallback(async (workOrderId: string, data: LabWorkOrderStatusChange) => {
    return changeLabWorkOrderStatus(workOrderId, data);
  }, []);

  const remove = useCallback(async (workOrderId: string) => {
    return deleteLabWorkOrder(workOrderId);
  }, []);

  return {
    workOrders,
    partners,
    loading,
    loadPartners,
    loadWorkOrders,
    loadPatientWorkOrders,
    getWorkOrder,
    create,
    update,
    changeStatus,
    remove,
  };
}
