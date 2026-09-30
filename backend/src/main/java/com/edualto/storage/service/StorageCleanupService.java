package com.edualto.storage.service;

import java.util.Collection;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class StorageCleanupService {
    private static final Logger log = LoggerFactory.getLogger(StorageCleanupService.class);

    private final StorageService storage;

    public StorageCleanupService(StorageService storage) {
        this.storage = storage;
    }

    public void deleteAfterCommit(Collection<String> objectKeys) {
        List<String> keys = objectKeys.stream()
                .filter(key -> key != null && !key.isBlank())
                .distinct()
                .toList();
        if (keys.isEmpty()) {
            return;
        }
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            throw new IllegalStateException("Storage cleanup must be registered inside a database transaction");
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                for (String key : keys) {
                    try {
                        storage.deleteObject(key);
                    } catch (RuntimeException exception) {
                        log.warn("Failed to delete storage object after database commit: {}", key, exception);
                    }
                }
            }
        });
    }
}
