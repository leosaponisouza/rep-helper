package com.alpendre.backend.finance;

import org.springframework.data.jpa.repository.JpaRepository;

public interface BalanceAdjustmentRepository extends JpaRepository<BalanceAdjustment, Long> {
}
