import { Contract, Payment } from "../types";

export const runCollectionReconciliation = (contracts: Contract[], payments: Payment[]) => {
  const validContracts = contracts.filter(
    (c) => c.recordStatus !== "duplicate" && c.recordStatus !== "excluded" && c.status !== "cancelled"
  );
  
  const validPayments = payments.filter(
    (p) => p.recordStatus !== "duplicate" && p.recordStatus !== "excluded" && p.status !== "reversed" && p.status !== "refunded"
  );

  const totalContractValue = validContracts.reduce((sum, c) => sum + (c.totalValue || 0), 0);
  const totalPaymentValue = validPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  
  const gap = totalContractValue - totalPaymentValue;
  
  const results = {
    totalContracts: validContracts.length,
    totalPayments: validPayments.length,
    totalContractValue,
    totalPaymentValue,
    gap,
    unlinkedPayments: validPayments.filter(p => !p.contractId).length,
    unlinkedPaymentsValue: validPayments.filter(p => !p.contractId).reduce((sum, p) => sum + p.amount, 0),
    contractsWithNoPayments: validContracts.filter(c => !validPayments.some(p => p.contractId === c.id)).length,
    contractsWithGap: validContracts.filter(c => {
      const contractPayments = validPayments.filter(p => p.contractId === c.id);
      const paid = contractPayments.reduce((sum, p) => sum + p.amount, 0);
      return Math.abs((c.totalValue || 0) - paid) > 1;
    }).length,
    topGapContracts: validContracts
      .map(c => {
        const contractPayments = validPayments.filter(p => p.contractId === c.id);
        const paid = contractPayments.reduce((sum, p) => sum + p.amount, 0);
        return {
          id: c.id,
          contractNumber: c.contractNumber,
          customerName: c.customerName,
          totalValue: c.totalValue,
          paidInSystem: paid,
          paidInField: c.paidAmount,
          gap: (c.totalValue || 0) - paid
        };
      })
      .filter(c => c.gap > 1)
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 10)
  };
  
  console.log("=== RECONCILIATION DIAGNOSTIC ===", results);
  return results;
};
