package com.livemart.payment.architecture;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.*;
import static com.tngtech.archunit.library.Architectures.layeredArchitecture;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

@DisplayName("Payment Service 아키텍처 테스트")
class ArchitectureTest {

    private static JavaClasses classes;

    @BeforeAll
    static void setup() {
        classes = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages("com.livemart.payment");
    }

    @Test
    @DisplayName("레이어드 아키텍처 준수 확인")
    void layeredArchitectureShouldBeRespected() {
        layeredArchitecture()
                .consideringAllDependencies()
                .layer("Controller").definedBy("..controller..")
                .layer("Service").definedBy("..service..")
                .layer("Repository").definedBy("..repository..")
                .layer("Domain").definedBy("..domain..")
                .whereLayer("Controller").mayNotBeAccessedByAnyLayer()
                .whereLayer("Service").mayOnlyBeAccessedByLayers("Controller")
                .whereLayer("Repository").mayOnlyBeAccessedByLayers("Service")
                .check(classes);
    }

    @Test
    @DisplayName("순환 의존성 없음")
    void noCyclicDependencies() {
        slices().matching("com.livemart.payment.(*)..")
                .should().beFreeOfCycles()
                .check(classes);
    }

    @Test
    @DisplayName("Controller는 @RestController 어노테이션 필수")
    void controllersShouldBeAnnotated() {
        classes().that().resideInAPackage("..controller..")
                .should().beAnnotatedWith(org.springframework.web.bind.annotation.RestController.class)
                .check(classes);
    }

    @Test
    @DisplayName("Service는 @Service 어노테이션 필수")
    void servicesShouldBeAnnotated() {
        classes().that().resideInAPackage("..service..")
                .should().beAnnotatedWith(org.springframework.stereotype.Service.class)
                .check(classes);
    }
}
