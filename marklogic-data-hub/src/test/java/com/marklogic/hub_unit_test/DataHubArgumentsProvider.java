package com.marklogic.hub_unit_test;

import com.marklogic.bootstrap.TestAppInstaller;
import com.marklogic.client.DatabaseClient;
import com.marklogic.client.ext.helper.LoggingObject;
import com.marklogic.hub.impl.HubConfigImpl;
import com.marklogic.hub.test.HubConfigInterceptor;
import com.marklogic.test.unit.TestManager;
import com.marklogic.test.unit.TestModule;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.ArgumentsProvider;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.util.List;
import java.util.Properties;
import java.util.stream.Stream;

/**
 * Need to use a custom ArgumentsProvider instead of the one in marklogic-unit-test, as we need to fetch a HubConfig
 * via HubConfigInterceptor.
 */
public class DataHubArgumentsProvider extends LoggingObject implements ArgumentsProvider {

    @Override
    public Stream<? extends Arguments> provideArguments(ExtensionContext extensionContext) {
        HubConfigImpl hubConfig = getHubConfigFromCurrentThread(extensionContext);
        configureHubConfigToRunAsAdminUser(extensionContext, hubConfig);

        logger.info("Loading test modules and running security commands to ensure that test modules and certain " +
            "test resources are in place before unit tests are run; host: " + hubConfig.getHost() + "; user: " + hubConfig.getMlUsername());
        TestAppInstaller.loadTestModules(hubConfig, true);
        Properties newProps = new Properties();
        String previousUsername = hubConfig.getMlUsername();
        String previousPassword = hubConfig.getPassword();
        newProps.setProperty("mlUsername", "test-data-hub-developer");
        newProps.setProperty("mlPassword", "password");
        hubConfig.applyProperties(newProps);
        final DatabaseClient client = hubConfig.newFinalClient();
        final TestManager testManager = new TestManager(client);
        newProps.setProperty("mlUsername", previousUsername);
        newProps.setProperty("mlPassword", previousPassword);
        hubConfig.applyProperties(newProps);
        try {
            List<TestModule> testModules = testManager.list();
            logger.info("marklogic-unit-test test count: " + testModules.size());
            return Stream.of(testModules.toArray(new TestModule[]{})).map((testModule) -> Arguments.of(testModule, testManager));
        } catch (Exception ex) {
            logger.error("Could not obtain a list of marklogic-unit-test modules; " +
                "please verify that the ml-unit-test library has been properly loaded and that /v1/resources/marklogic-unit-test is accessible", ex);
            return Stream.of();
        }
    }

    private HubConfigImpl getHubConfigFromCurrentThread(ExtensionContext extensionContext) {
        HubConfigInterceptor hubConfigInterceptor = SpringExtension.getApplicationContext(extensionContext).getBean(HubConfigInterceptor.class);
        hubConfigInterceptor.borrowHubConfig(Thread.currentThread().getName());
        return hubConfigInterceptor.getProxiedHubConfig(Thread.currentThread().getName());
    }

    private void configureHubConfigToRunAsAdminUser(ExtensionContext extensionContext, HubConfigImpl hubConfig) {
        Properties gradleProps = SpringExtension.getApplicationContext(extensionContext)
            .getBean(HubConfigInterceptor.class).getHubConfigObjectFactory().getGradleProperties();

        Properties props = new Properties();
        props.putAll(gradleProps);

        // Need to run as admin in order to run TestAppInstaller function
        props.setProperty("mlUsername", "test-admin-for-data-hub-tests");
        props.setProperty("mlPassword", "password");
        props.setProperty("mlHost", hubConfig.getHost());
        hubConfig.applyProperties(props);
    }
}
