package com.livemart.common.event;

public interface EventPublisher {
    void publish(DomainEvent event);
    void publish(String topic, DomainEvent event);
}
