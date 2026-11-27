package com.alpendre.backend.finance;

import com.alpendre.backend.common.BusinessException;
import com.alpendre.backend.house.House;
import com.alpendre.backend.house.HouseRepository;
import java.math.BigDecimal;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HouseBalanceLedger {

    private final HouseRepository houseRepo;
    private final BalanceAdjustmentRepository adjustmentRepo;

    public HouseBalanceLedger(
            HouseRepository houseRepo,
            BalanceAdjustmentRepository adjustmentRepo
    ) {
        this.houseRepo = houseRepo;
        this.adjustmentRepo = adjustmentRepo;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public House applyDelta(UUID houseId, BigDecimal delta) {
        House house = houseRepo.findByIdForUpdate(houseId)
                .orElseThrow(() -> BusinessException.notFound("HOUSE_NOT_FOUND", "Casa não encontrada."));
        house.setCurrentBalance(house.getCurrentBalance().add(delta));
        return houseRepo.save(house);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public House setTargetBalance(UUID houseId, UUID actorUid, BigDecimal targetBalance, String description) {
        House house = houseRepo.findByIdForUpdate(houseId)
                .orElseThrow(() -> BusinessException.notFound("HOUSE_NOT_FOUND", "Casa não encontrada."));
        BigDecimal previous = house.getCurrentBalance();
        BigDecimal delta = targetBalance.subtract(previous);
        house.setCurrentBalance(targetBalance);
        House saved = houseRepo.save(house);

        BalanceAdjustment audit = new BalanceAdjustment();
        audit.setHouseId(houseId);
        audit.setActorUid(actorUid);
        audit.setPreviousBalance(previous);
        audit.setNewBalance(targetBalance);
        audit.setDelta(delta);
        audit.setDescription(description != null && !description.isBlank() ? description.trim() : null);
        adjustmentRepo.save(audit);
        return saved;
    }
}
