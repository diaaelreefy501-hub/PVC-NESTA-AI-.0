import { 
  Contract, 
  Payment, 
  Employee, 
  SalaryPayment, 
  CommissionPayment, 
  CommissionAdjustment,
  EmployeeSalaryRecord,
  Company,
  StatementContractDetail,
  StatementApprovalStatus,
  MonthlyStatement
} from "../types";

export interface ContractFinancials {
  totalValue: number;
  collectedAmount: number;
  outstandingBalance: number;
  collectionRate: number;
}

/**
 * Unified logic to calculate the financial state of a contract
 */
export const calculateContractBalance = (contract: Contract, payments: Payment[]): ContractFinancials => {
  const totalValue = Number(contract.totalValue) || 0;
  
  // Sum ONLY confirmed/active payments linked to this contract
  const collectedAmount = payments
    .filter(p => 
      p.contractId === contract.id && 
      p.recordStatus !== 'duplicate' && 
      p.recordStatus !== 'excluded' &&
      p.status !== 'reversed' &&
      p.status !== 'refunded'
    )
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    
  const outstandingBalance = Math.max(0, totalValue - collectedAmount);
  const collectionRate = totalValue > 0 ? (collectedAmount / totalValue) * 100 : 0;
  
  return {
    totalValue,
    collectedAmount,
    outstandingBalance,
    collectionRate
  };
};

/**
 * Generate monthly statements for an employee since hire date
 */
export const generateEmployeeStatements = (
  employee: Employee,
  companies: Company[],
  contracts: Contract[],
  payments: Payment[],
  salaryPayments: SalaryPayment[],
  commissionPayments: CommissionPayment[],
  commissionAdjustments: CommissionAdjustment[] = [],
  maxMonths: number = 9
): MonthlyStatement[] => {
  const statements: MonthlyStatement[] = [];
  const hireDate = new Date(employee.startDate);
  const now = new Date();
  const company = companies.find(c => c.id === employee.companyId);
  const companyName = company?.name || "Unknown";

  // Iterate backwards from current month to hire date, max 9 months
  let current = new Date(now.getFullYear(), now.getMonth(), 1);
  const hireMonthStart = new Date(hireDate.getFullYear(), hireDate.getMonth(), 1);
  
  let count = 0;
  while (current >= hireMonthStart && count < maxMonths) {
    const period = current.toISOString().substring(0, 7); // YYYY-MM
    
    // 0. Check for Persisted Statement / Overrides
    const persisted = employee.monthlyStatements?.find(s => s.period === period);

    // 1. Determine Effective Salary for this period
    let baseSalary = employee.monthlySalary;
    if (employee.salaryHistory && employee.salaryHistory.length > 0) {
      // Find the record where period is between effectiveFrom and effectiveTo
      const record = employee.salaryHistory.find(r => {
        const from = r.effectiveFrom;
        const to = r.effectiveTo;
        return period >= from && (!to || period <= to);
      });
      if (record) {
        baseSalary = record.monthlySalary;
      }
    }

    // 2. Calculate Salary Due (pro-rate if hire date is middle of month)
    let salaryDue = persisted?.salaryDue !== undefined ? persisted.salaryDue : baseSalary;
    const isHireMonth = current.getMonth() === hireDate.getMonth() && current.getFullYear() === hireDate.getFullYear();
    if (isHireMonth && persisted?.salaryDue === undefined) {
      const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
      const workedDays = daysInMonth - hireDate.getDate() + 1;
      salaryDue = Math.round((baseSalary / daysInMonth) * workedDays);
    }

    // 3. Calculate Commission for this month
    const monthlyContracts = contracts.filter(c => {
      if (c.recordStatus === 'duplicate' || c.recordStatus === 'excluded' || c.status === 'cancelled') return false;
      if (c.companyId !== employee.companyId) return false;
      
      const isAssigned = 
        (c.salesPerson === employee.name) || 
        (c.responsible === employee.name) || 
        ((c as any).salesRep === employee.name) || 
        ((c as any).assignedTo === employee.name);
      
      if (!isAssigned) return false;

      const cDate = c.date || c.signDate || c.createdAt || "";
      return cDate.includes(period) || cDate.startsWith(period);
    });

    // Determine Effective Commission Rate for this period
    let commissionRate = employee.commissionPercentage || company?.commissionRate || 2.5;
    if (employee.commissionHistory && employee.commissionHistory.length > 0) {
      const record = employee.commissionHistory.find(r => {
        const from = r.effectiveFrom;
        const to = r.effectiveTo;
        return period >= from && (!to || period <= to);
      });
      if (record) {
        commissionRate = record.percentage;
      }
    }
    
    // Commission Timing Trigger Logic
    const commissionTiming = employee.commissionTiming || company?.commissionTiming || 'contract_signing';
    
    const contractsDetail: StatementContractDetail[] = monthlyContracts.map(c => {
      const financials = calculateContractBalance(c, payments);
      let eligible = false;
      let triggerStatus = "";
      
      if (commissionTiming === 'contract_signing') {
        eligible = true;
        triggerStatus = "تم توقيع العقد";
      } else if (commissionTiming === 'down_payment') {
        eligible = (financials.collectedAmount || 0) > 0;
        triggerStatus = eligible ? "تم دفع الدفعة الأولى" : "بانتظار الدفعة الأولى";
      } else if (commissionTiming === 'full_collection') {
        eligible = financials.outstandingBalance <= 0 && financials.totalValue > 0;
        triggerStatus = eligible ? "تم التحصيل بالكامل" : "التحصيل غير مكتمل";
      } else if (commissionTiming === 'payment_based') {
        // Commission earned only on what was collected THIS month for these contracts
        // This is a special case, but for now we follow the "eligible contract" model
        eligible = (financials.collectedAmount || 0) > 0;
        triggerStatus = `تم تحصيل ${financials.collectedAmount.toLocaleString()} ج.م`;
      } else {
        eligible = true;
        triggerStatus = "معتمد تلقائياً";
      }

      const commissionBase = Number(c.totalValue) || 0;
      const earnedAmount = eligible ? Math.round((commissionBase * commissionRate) / 100) : 0;

      return {
        id: `sd-${c.id}-${period}`,
        contractId: c.id,
        contractNumber: c.contractNumber,
        customerName: c.customerName,
        date: c.date || c.signDate || c.createdAt || "",
        totalValue: financials.totalValue,
        paidAmount: financials.collectedAmount,
        remainingAmount: financials.outstandingBalance,
        isEligible: eligible,
        triggerStatus,
        commissionRate,
        commissionBase,
        earnedAmount
      };
    });

    const eligibleContracts = contractsDetail.filter(d => d.isEligible);
    const eligibleContractsCount = eligibleContracts.length;
    const eligibleContractsTotal = eligibleContracts.reduce((sum, d) => sum + d.commissionBase, 0);
    const eligibleCollectionTotal = eligibleContracts.reduce((sum, d) => sum + d.paidAmount, 0);

    // USER REQUIREMENT: إجمالي قيمة العقود المؤهلة للموظف في الشهر × نسبة العمولة = عمولة الشهر
    // We use the aggregate total to apply the rate once, as requested.
    const calculatedCommission = Math.round((eligibleContractsTotal * commissionRate) / 100);
    const commissionEarned = persisted?.commissionEarned !== undefined 
      ? persisted.commissionEarned 
      : calculatedCommission;

    // 4. Adjustments
    const monthlyAdjustments = commissionAdjustments.filter(adj => adj.employeeId === employee.id && adj.period === period);
    const bonuses = monthlyAdjustments.filter(a => a.amount > 0).reduce((sum, a) => sum + a.amount, 0);
    const deductions = Math.abs(monthlyAdjustments.filter(a => a.amount < 0).reduce((sum, a) => sum + a.amount, 0));
    const adjustmentsTotal = bonuses - deductions;

    // 5. Total Due
    const totalDue = salaryDue + commissionEarned + adjustmentsTotal;

    // 6. Total Paid
    const paidSalary = salaryPayments
      .filter(p => p.employeeId === employee.id && p.period === period && p.status === 'paid')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    
    const paidCommission = commissionPayments
      .filter(p => p.employeeId === employee.id && p.period === period && p.status === 'paid')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
      
    const totalPaid = paidSalary + paidCommission;
    const remaining = Math.max(0, totalDue - totalPaid);
    
    // Status Logic
    const metadata = employee.monthlyStatements?.find(m => m.period === period);
    const status = metadata?.status || 'calculated';
    const recalculatedAt = metadata?.recalculatedAt;

    statements.push({
      id: metadata?.id || `stmt-${employee.id}-${period}`,
      employeeId: employee.id,
      employeeName: employee.name,
      companyId: employee.companyId,
      period,
      startDate: `${period}-01`,
      endDate: new Date(current.getFullYear(), current.getMonth() + 1, 0).toISOString().substring(0, 10),
      salaryDue,
      salaryPaid: paidSalary,
      eligibleContractsCount,
      eligibleContractsTotal,
      eligibleCollectionTotal,
      commissionRateUsed: commissionRate,
      commissionEarned,
      bonuses,
      deductions,
      adjustments: adjustmentsTotal,
      totalDue,
      totalPaid,
      paidCommission,
      paidSalary,
      remaining,
      status,
      calculatedAt: metadata?.calculatedAt || new Date().toISOString(),
      recalculatedAt,
      contractDetails: contractsDetail,
      notes: metadata?.notes || "",
      history: metadata?.history || [],
      updatedAt: metadata?.updatedAt || new Date().toISOString()
    });

    // Move to previous month
    current.setMonth(current.getMonth() - 1);
    count++;
  }

  return statements; // Already newest first because we go backwards
};
