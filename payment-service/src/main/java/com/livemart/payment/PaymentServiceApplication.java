package com.livemart.payment;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(scanBasePackages = {"com.livemart.payment", "com.livemart.common"})
@EnableDiscoveryClient
@EnableScheduling
@EntityScan(basePackages = {"com.livemart.payment.domain", "com.livemart.common.outbox"})
@EnableJpaRepositories(basePackages = {"com.livemart.payment.repository", "com.livemart.common.outbox"})
public class PaymentServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(PaymentServiceApplication.class, args);
    }
}
