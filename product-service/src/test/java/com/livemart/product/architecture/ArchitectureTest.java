package com.livemart.product.architecture;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.*;
import static com.tngtech.archunit.library.Architectures.layeredArchitecture;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

@DisplayName("Architecture Tests - Product Service")
class ArchitectureTest {

    private static JavaClasses classes;

    @BeforeAll
    static void setup() {
        classes = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages("com.livemart.product");
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
    @DisplayName("No cyclic dependencies between packages")
    void noCyclicDependencies() {
        slices().matching("com.livemart.product.(*)..")
                .should().beFreeOfCycles()
                .check(classes);
    }

    @Test
    @DisplayName("Domain entities should not depend on service layer")
    void domainShouldNotDependOnService() {
        noClasses().that().resideInAPackage("..domain..")
                .should().dependOnClassesThat()
                .resideInAPackage("..service..")
                .because("Domain layer should not depend on service layer")
                .check(classes);
    }
}
