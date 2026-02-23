package com.livemart.inventory;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(scanBasePackages = {"com.livemart.inventory", "com.livemart.common"})
@EntityScan(basePackages = {"com.livemart.inventory.domain", "com.livemart.common.outbox"})
@EnableJpaRepositories(basePackages = {"com.livemart.inventory.repository", "com.livemart.common.outbox"})
@EnableDiscoveryClient
@EnableScheduling
public class InventoryServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(InventoryServiceApplication.class, args);
    }
}
