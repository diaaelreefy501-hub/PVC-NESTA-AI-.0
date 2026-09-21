import { Contract, Payment } from "../types";
import { calculateContractBalance } from "./financeEngine";

export interface DiscrepancyReport {
  contractId: string;
  contractNumber: string;
  customerName: string;
  reportedPaidAmount: number; // From Contract object
  summedPayments: number;     // From Payment collection
  totalValue: number;
  difference: number;
  calculatedBalance: number;
  status: string;
}

export const runFinanceDiagnostics = (contracts: Contract[], payments: Payment[]) => {
  const discrepancies: DiscrepancyReport[] = [];
  let totalCalculatedOutstanding = 0;

  contracts.forEach(contract => {
    if (contract.recordStatus === 'duplicate' || contract.recordStatus === 'excluded') return;
    
    const financials = calculateContractBalance(contract, payments);
    const summedPayments = payments
      .filter(p => p.contractId === contract.id && p.status !== 'reversed')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    
    const reportedPaid = Number(contract.paidAmount) || 0;
    const diff = reportedPaid - summedPayments;
    
    if (financials.outstandingBalance > 0 || Math.abs(diff) > 1) {
      discrepancies.push({
        contractId: contract.id,
        contractNumber: contract.contractNumber,
        customerName: contract.customerName,
        reportedPaidAmount: reportedPaid,
        summedPayments: summedPayments,
        totalValue: financials.totalValue,
        difference: diff,
        calculatedBalance: financials.outstandingBalance,
        status: contract.status
      });
      
      totalCalculatedOutstanding += financials.outstandingBalance;
    }
  });

  return {
    discrepancies: discrepancies.sort((a, b) => b.calculatedBalance - a.calculatedBalance),
    totalCalculatedOutstanding,
    analyzedCount: contracts.length
  };
};
