package com.rephelper.backend.finance;

import com.rephelper.backend.common.BusinessException;
import com.rephelper.backend.republic.Republic;
import com.rephelper.backend.republic.RepublicRepository;
import java.math.BigDecimal;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RepublicBalanceLedger {

    private final RepublicRepository republicRepo;
    private final BalanceAdjustmentRepository adjustmentRepo;

    public RepublicBalanceLedger(
            RepublicRepository republicRepo,
            BalanceAdjustmentRepository adjustmentRepo
    ) {
        this.republicRepo = republicRepo;
        this.adjustmentRepo = adjustmentRepo;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public Republic applyDelta(UUID republicId, BigDecimal delta) {
        Republic republic = republicRepo.findByIdForUpdate(republicId)
                .orElseThrow(() -> BusinessException.notFound("REPUBLIC_NOT_FOUND", "República não encontrada."));
        republic.setCurrentBalance(republic.getCurrentBalance().add(delta));
        return republicRepo.save(republic);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public Republic setTargetBalance(UUID republicId, UUID actorUid, BigDecimal targetBalance, String description) {
        Republic republic = republicRepo.findByIdForUpdate(republicId)
                .orElseThrow(() -> BusinessException.notFound("REPUBLIC_NOT_FOUND", "República não encontrada."));
        BigDecimal previous = republic.getCurrentBalance();
        BigDecimal delta = targetBalance.subtract(previous);
        republic.setCurrentBalance(targetBalance);
        Republic saved = republicRepo.save(republic);

        BalanceAdjustment audit = new BalanceAdjustment();
        audit.setRepublicId(republicId);
        audit.setActorUid(actorUid);
        audit.setPreviousBalance(previous);
        audit.setNewBalance(targetBalance);
        audit.setDelta(delta);
        audit.setDescription(description != null && !description.isBlank() ? description.trim() : null);
        adjustmentRepo.save(audit);
        return saved;
    }
}
