package com.livemart.order.architecture;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.*;
import static com.tngtech.archunit.library.Architectures.layeredArchitecture;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

@DisplayName("Architecture Tests - Order Service")
class ArchitectureTest {

    private static JavaClasses classes;

    @BeforeAll
    static void setup() {
        classes = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages("com.livemart.order");
    }

    @Test
    @DisplayName("Layered architecture should be respected")
    void layeredArchitectureShouldBeRespected() {
        layeredArchitecture()
                .consideringAllDependencies()
                .layer("Controller").definedBy("..controller..")
                .layer("Service").definedBy("..service..")
                .layer("Repository").definedBy("..repository..")
                .layer("Domain").definedBy("..domain..")
                .layer("DTO").definedBy("..dto..")
                .layer("Config").definedBy("..config..")
                .whereLayer("Controller").mayNotBeAccessedByAnyLayer()
                .whereLayer("Service").mayOnlyBeAccessedByLayers("Controller", "Config")
                .whereLayer("Repository").mayOnlyBeAccessedByLayers("Service")
                .check(classes);
    }

    @Test
    @DisplayName("Controllers should be annotated with @RestController")
    void controllersShouldBeAnnotated() {
        classes().that().resideInAPackage("..controller..")
                .and().areNotInterfaces()
                .should().beAnnotatedWith(org.springframework.web.bind.annotation.RestController.class)
                .check(classes);
    }

    @Test
    @DisplayName("Services should be annotated with @Service")
    void servicesShouldBeAnnotated() {
        classes().that().resideInAPackage("..service..")
                .and().areNotInterfaces()
                .and().haveSimpleNameEndingWith("Service")
                .should().beAnnotatedWith(org.springframework.stereotype.Service.class)
                .check(classes);
    }

    @Test
    @DisplayName("Domain entities should not depend on Spring framework")
    void domainShouldNotDependOnSpring() {
        noClasses().that().resideInAPackage("..domain..")
                .should().dependOnClassesThat()
                .resideInAPackage("org.springframework..")
                .because("Domain layer should be framework-independent")
                .check(classes);
    }

    @Test
    @DisplayName("No cyclic dependencies between packages")
    void noCyclicDependencies() {
        slices().matching("com.livemart.order.(*)..")
                .should().beFreeOfCycles()
                .check(classes);
    }

    @Test
    @DisplayName("Repository interfaces should extend JpaRepository")
    void repositoriesShouldExtendJpaRepository() {
        classes().that().resideInAPackage("..repository..")
                .and().areInterfaces()
                .should().beAssignableTo(org.springframework.data.jpa.repository.JpaRepository.class)
                .check(classes);
    }
}
