/*
 * Copyright 2012-2018 MarkLogic Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.marklogic.hub.impl;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.marklogic.appdeployer.AppConfig;
import com.marklogic.appdeployer.ConfigDir;
import com.marklogic.appdeployer.DefaultAppConfigFactory;
import com.marklogic.client.DatabaseClient;
import com.marklogic.client.DatabaseClientFactory;
import com.marklogic.client.ext.DatabaseClientConfig;
import com.marklogic.client.ext.SecurityContextType;
import com.marklogic.client.ext.modulesloader.ssl.SimpleX509TrustManager;
import com.marklogic.hub.DatabaseKind;
import com.marklogic.hub.HubConfig;
import com.marklogic.hub.HubProject;
import com.marklogic.hub.error.DataHubConfigurationException;
import com.marklogic.hub.error.DataHubProjectException;
import com.marklogic.hub.error.InvalidDBOperationError;
import com.marklogic.mgmt.DefaultManageConfigFactory;
import com.marklogic.mgmt.ManageClient;
import com.marklogic.mgmt.ManageConfig;
import com.marklogic.mgmt.admin.AdminConfig;
import com.marklogic.mgmt.admin.AdminManager;
import com.marklogic.mgmt.admin.DefaultAdminConfigFactory;
import org.apache.commons.text.CharacterPredicate;
import org.apache.commons.text.RandomStringGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.PropertySource;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import javax.net.ssl.SSLContext;
import javax.net.ssl.X509TrustManager;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Properties;

@JsonAutoDetect(
    fieldVisibility = JsonAutoDetect.Visibility.PROTECTED_AND_PUBLIC,
    getterVisibility = JsonAutoDetect.Visibility.ANY,
    setterVisibility = JsonAutoDetect.Visibility.ANY)
@Component
@PropertySource({"classpath:dhf-defaults.properties"})
public class HubConfigImpl implements HubConfig
{
    @Autowired
    private HubProject hubProject;

    @Autowired
    private Environment environment;

    // a set of properties to use for legacy token replacement.
    Properties projectProperties = null;

    @Autowired
    FlowManagerImpl flowManager;
    @Autowired
    DataHubImpl dataHub;
    @Autowired
    Versions versions;


    protected String host;

    protected String stagingDbName;
    protected String stagingHttpName;
    protected Integer stagingForestsPerHost;
    protected Integer stagingPort;
    protected String stagingAuthMethod;
    private String stagingScheme;
    private Boolean stagingSimpleSsl;

    private SSLContext stagingSslContext;
    private DatabaseClientFactory.SSLHostnameVerifier stagingSslHostnameVerifier;
    private String stagingCertFile;
    private String stagingCertPassword;
    private String stagingExternalName;
    private X509TrustManager stagingTrustManager;


    protected String finalDbName;
    protected String finalHttpName;
    protected Integer finalForestsPerHost;
    protected Integer finalPort;
    protected String finalAuthMethod;
    private String finalScheme;

    private Boolean finalSimpleSsl;
    private SSLContext finalSslContext;
    private DatabaseClientFactory.SSLHostnameVerifier finalSslHostnameVerifier;
    private String finalCertFile;
    private String finalCertPassword;
    private String finalExternalName;
    private X509TrustManager finalTrustManager;


    protected String jobDbName;
    protected String jobHttpName;
    protected Integer jobForestsPerHost;
    protected Integer jobPort;
    protected String jobAuthMethod;
    private String jobScheme;

    private Boolean jobSimpleSsl;
    private SSLContext jobSslContext;
    private DatabaseClientFactory.SSLHostnameVerifier jobSslHostnameVerifier;
    private String jobCertFile;
    private String jobCertPassword;
    private String jobExternalName;
    private X509TrustManager jobTrustManager;


    protected String modulesDbName;
    protected Integer modulesForestsPerHost = 1;
    protected String stagingTriggersDbName;
    protected Integer stagingTriggersForestsPerHost;
    protected String finalTriggersDbName;
    protected Integer finalTriggersForestsPerHost;
    protected String stagingSchemasDbName;
    protected Integer stagingSchemasForestsPerHost;
    protected String finalSchemasDbName;
    protected Integer finalSchemasForestsPerHost;


    private String hubRoleName;
    private String hubUserName;

    private String hubAdminRoleName;
    private String hubAdminUserName;

    private String DHFVersion;

    // these hold runtime credentials for flows.
    private String mlUsername = null;
    private String mlPassword = null;

    private String loadBalancerHost;
    private Boolean isHostLoadBalancer;

    private Boolean isProvisionedEnvironment;

    protected String customForestPath;

    protected String modulePermissions;

    private ManageConfig manageConfig;
    private ManageClient manageClient;
    private AdminConfig adminConfig;
    private AdminManager adminManager;

    private AppConfig appConfig;

    private static final Logger logger = LoggerFactory.getLogger(HubConfigImpl.class);

    private ObjectMapper objmapper;

    private String envString;

    public HubConfigImpl() {
        objmapper = new ObjectMapper();
        projectProperties = new Properties();
    }


    public void createProject(String projectDirString) {
        hubProject.createProject(projectDirString);
        initializeApplicationConfigurations();
    }

    public String getHost() { return appConfig.getHost(); }

    @Override public String getDbName(DatabaseKind kind){
        String name;
        switch (kind) {
            case STAGING:
                name = stagingDbName;
                break;
            case FINAL:
                name = finalDbName;
                break;
            case JOB:
                name = jobDbName;
                break;
            case TRACE:
                name = jobDbName;
                break;
            case MODULES:
                name = modulesDbName;
                break;
            case STAGING_MODULES:
                name = modulesDbName;
                break;
            case FINAL_MODULES:
                name = modulesDbName;
                break;
            case STAGING_TRIGGERS:
                name = stagingTriggersDbName;
                break;
            case FINAL_TRIGGERS:
                name = finalTriggersDbName;
                break;
            case STAGING_SCHEMAS:
                name = stagingSchemasDbName;
                break;
            case FINAL_SCHEMAS:
                name = finalSchemasDbName;
                break;
            default:
                throw new InvalidDBOperationError(kind, "grab database name");
        }
        return name;
    }

    @Override public void setDbName(DatabaseKind kind, String dbName){
        switch (kind) {
            case STAGING:
                stagingDbName = dbName;
                break;
            case FINAL:
                finalDbName = dbName;
                break;
            case JOB:
                jobDbName = dbName;
                break;
            case TRACE:
                jobDbName = dbName;
                break;
            case MODULES:
                modulesDbName = dbName;
                break;
            case STAGING_MODULES:
                modulesDbName = dbName;
                break;
            case FINAL_MODULES:
                modulesDbName = dbName;
                break;
            case STAGING_TRIGGERS:
                stagingTriggersDbName = dbName;
                break;
            case FINAL_TRIGGERS:
                finalTriggersDbName = dbName;
                break;
            case STAGING_SCHEMAS:
                stagingSchemasDbName = dbName;
                break;
            case FINAL_SCHEMAS:
                finalSchemasDbName = dbName;
                break;
            default:
                throw new InvalidDBOperationError(kind, "set database name");
        }
    }

    @Override public String getHttpName(DatabaseKind kind){
        String name;
        switch (kind) {
            case STAGING:
                name = stagingHttpName;
                break;
            case FINAL:
                name = finalHttpName;
                break;
            case JOB:
                name = jobHttpName;
                break;
            case TRACE:
                name = jobHttpName;
                break;
            default:
                throw new InvalidDBOperationError(kind, "grab http name");
        }
        return name;
    }

    @Override public void setHttpName(DatabaseKind kind, String httpName){
        switch (kind) {
            case STAGING:
                stagingHttpName = httpName;
                break;
            case FINAL:
                finalHttpName = httpName;
                break;
            case JOB:
                jobHttpName = httpName;
                break;
            case TRACE:
                jobHttpName = httpName;
                break;
            default:
                throw new InvalidDBOperationError(kind, "set http name");
        }
    }

    @Override public Integer getForestsPerHost(DatabaseKind kind){
        Integer forests;
        switch (kind) {
            case STAGING:
                forests = stagingForestsPerHost;
                break;
            case FINAL:
                forests = finalForestsPerHost;
                break;
            case JOB:
                forests = jobForestsPerHost;
                break;
            case TRACE:
                forests = jobForestsPerHost;
                break;
            case MODULES:
                forests = modulesForestsPerHost;
                break;
            case STAGING_MODULES:
                forests = modulesForestsPerHost;
                break;
            case FINAL_MODULES:
                forests = modulesForestsPerHost;
                break;
            case STAGING_TRIGGERS:
                forests = stagingTriggersForestsPerHost;
                break;
            case FINAL_TRIGGERS:
                forests = finalTriggersForestsPerHost;
                break;
            case STAGING_SCHEMAS:
                forests = stagingSchemasForestsPerHost;
                break;
            case FINAL_SCHEMAS:
                forests = finalSchemasForestsPerHost;
                break;
            default:
                throw new InvalidDBOperationError(kind, "grab count of forests per host");
        }
        return forests;
    }

    @Override public void setForestsPerHost(DatabaseKind kind, Integer forestsPerHost){
        switch (kind) {
            case STAGING:
                stagingForestsPerHost = forestsPerHost;
                break;
            case FINAL:
                finalForestsPerHost = forestsPerHost;
                break;
            case JOB:
                jobForestsPerHost = forestsPerHost;
                break;
            case TRACE:
                jobForestsPerHost = forestsPerHost;
                break;
            case MODULES:
                modulesForestsPerHost = forestsPerHost;
                break;
            case STAGING_MODULES:
                modulesForestsPerHost = forestsPerHost;
                break;
            case FINAL_MODULES:
                modulesForestsPerHost = forestsPerHost;
                break;
            case STAGING_TRIGGERS:
                stagingTriggersForestsPerHost = forestsPerHost;
                break;
            case FINAL_TRIGGERS:
                finalTriggersForestsPerHost = forestsPerHost;
                break;
            case STAGING_SCHEMAS:
                stagingSchemasForestsPerHost = forestsPerHost;
                break;
            case FINAL_SCHEMAS:
                finalSchemasForestsPerHost = forestsPerHost;
                break;
            default:
                throw new InvalidDBOperationError(kind, "set count of forests per host");
        }
    }

    @Override public Integer getPort(DatabaseKind kind){
        Integer port;
        switch (kind) {
            case STAGING:
                port = stagingPort;
                break;
            case FINAL:
                port = finalPort;
                break;
            case JOB:
                port = jobPort;
                break;
            case TRACE:
                port = jobPort;
                break;
            default:
                throw new InvalidDBOperationError(kind, "grab app port");
        }
        return port;
    }

    @Override public void setPort(DatabaseKind kind, Integer port){
        switch (kind) {
            case STAGING:
                stagingPort = port;
                break;
            case FINAL:
                finalPort = port;
                break;
            case JOB:
                jobPort = port;
                break;
            case TRACE:
                jobPort = port;
                break;
            default:
                throw new InvalidDBOperationError(kind, "set app port");
        }
    }


    @Override public SSLContext getSslContext(DatabaseKind kind) {
        SSLContext sslContext;
        switch (kind) {
            case STAGING:
                sslContext = this.stagingSslContext;
                break;
            case JOB:
                sslContext = this.jobSslContext;
                break;
            case TRACE:
                sslContext = this.jobSslContext;
                break;
            case FINAL:
                sslContext = this.finalSslContext;
                break;
            default:
                throw new InvalidDBOperationError(kind, "get ssl context");
        }
        return sslContext;
    }

    @Override public void setSslContext(DatabaseKind kind, SSLContext sslContext) {
        switch (kind) {
            case STAGING:
                this.stagingSslContext = sslContext;
                break;
            case JOB:
                this.jobSslContext = sslContext;
                break;
            case TRACE:
                this.jobSslContext = sslContext;
                break;
            case FINAL:
                this.finalSslContext = sslContext;
                break;
            default:
                throw new InvalidDBOperationError(kind, "set ssl context");
        }
    }

    @Override public DatabaseClientFactory.SSLHostnameVerifier getSslHostnameVerifier(DatabaseKind kind) {
        DatabaseClientFactory.SSLHostnameVerifier sslHostnameVerifier;
        switch (kind) {
            case STAGING:
                sslHostnameVerifier = this.stagingSslHostnameVerifier;
                break;
            case JOB:
                sslHostnameVerifier = this.jobSslHostnameVerifier;
                break;
            case TRACE:
                sslHostnameVerifier = this.jobSslHostnameVerifier;
                break;
            case FINAL:
                sslHostnameVerifier = this.finalSslHostnameVerifier;
                break;
            default:
                throw new InvalidDBOperationError(kind, "get ssl hostname verifier");
        }
        return sslHostnameVerifier;
    }

    @Override public void setSslHostnameVerifier(DatabaseKind kind, DatabaseClientFactory.SSLHostnameVerifier sslHostnameVerifier) {
        switch (kind) {
            case STAGING:
                this.stagingSslHostnameVerifier = sslHostnameVerifier;
                break;
            case JOB:
                this.jobSslHostnameVerifier = sslHostnameVerifier;
                break;
            case TRACE:
                this.jobSslHostnameVerifier = sslHostnameVerifier;
                break;
            case FINAL:
                this.finalSslHostnameVerifier = sslHostnameVerifier;
                break;
            default:
                throw new InvalidDBOperationError(kind, "set ssl hostname verifier");
        }
    }

    @Override public String getAuthMethod(DatabaseKind kind){
        String authMethod;
        switch (kind) {
            case STAGING:
                authMethod = this.stagingAuthMethod;
                break;
            case FINAL:
                authMethod = this.finalAuthMethod;
                break;
            case JOB:
                authMethod = this.jobAuthMethod;
                break;
            case TRACE:
                authMethod = this.jobAuthMethod;
                break;
            default:
                throw new InvalidDBOperationError(kind, "get auth method");
        }
        return authMethod;
    }

    @Override public void setAuthMethod(DatabaseKind kind, String authMethod) {
        switch (kind) {
            case STAGING:
                this.stagingAuthMethod = authMethod;
                break;
            case FINAL:
                this.finalAuthMethod = authMethod;
                break;
            case JOB:
                this.jobAuthMethod = authMethod;
                break;
            case TRACE:
                this.jobAuthMethod = authMethod;
                break;
            default:
                throw new InvalidDBOperationError(kind, "set auth method");
        }
    }

    public X509TrustManager getTrustManager(DatabaseKind kind) {
        switch (kind) {
            case STAGING:
                return this.stagingTrustManager;
            case JOB:
                return this.jobTrustManager;
            case FINAL:
                return this.finalTrustManager;
            default:
                throw new InvalidDBOperationError(kind, "set auth method");
        }
    }

    @Override
    public void setTrustManager(DatabaseKind kind, X509TrustManager trustManager) {
        switch (kind) {
            case STAGING:
                this.stagingTrustManager = trustManager;
                break;
            case JOB:
                this.jobTrustManager = trustManager;
                break;
            case FINAL:
                this.finalTrustManager = trustManager;
                break;
            default:
                throw new InvalidDBOperationError(kind, "set auth method");
        }
    }

    @Override public String getScheme(DatabaseKind kind){
        String scheme;
        switch (kind) {
            case STAGING:
                scheme = this.stagingScheme;
                break;
            case FINAL:
                scheme = this.finalScheme;
                break;
            case JOB:
                scheme = this.jobScheme;
                break;
            case TRACE:
                scheme = this.jobScheme;
                break;
            default:
                throw new InvalidDBOperationError(kind, "get scheme");
        }
        return scheme;
    }

    @Override public void setScheme(DatabaseKind kind, String scheme) {
        switch (kind) {
            case STAGING:
                this.stagingScheme = scheme;
                break;
            case FINAL:
                this.finalScheme = scheme;
                break;
            case JOB:
                this.jobScheme = scheme;
                break;
            case TRACE:
                this.jobScheme = scheme;
                break;
            default:
                throw new InvalidDBOperationError(kind, "set auth method");
        }
    }

    @Override public boolean getSimpleSsl(DatabaseKind kind){
        boolean simple;
        switch (kind) {
            case STAGING:
                simple = this.stagingSimpleSsl;
                break;
            case JOB:
                simple = this.jobSimpleSsl;
                break;
            case TRACE:
                simple = this.jobSimpleSsl;
                break;
            case FINAL:
                simple = this.finalSimpleSsl;
                break;
            default:
                throw new InvalidDBOperationError(kind, "get simple ssl");
        }
        return simple;
    }

    @Override public void setSimpleSsl(DatabaseKind kind, Boolean simpleSsl) {
        switch (kind) {
            case STAGING:
                this.stagingSimpleSsl = simpleSsl;
                break;
            case JOB:
                this.jobSimpleSsl = simpleSsl;
                break;
            case TRACE:
                this.jobSimpleSsl = simpleSsl;
                break;
            case FINAL:
                this.finalSimpleSsl = simpleSsl;
                break;
            default:
                throw new InvalidDBOperationError(kind, "set simple ssl");
        }
    }

    @Override public String getCertFile(DatabaseKind kind){
        String certFile;
        switch (kind) {
            case STAGING:
                certFile = this.stagingCertFile;
                break;
            case JOB:
                certFile = this.jobCertFile;
                break;
            case TRACE:
                certFile = this.jobCertFile;
                break;
            case FINAL:
                certFile = this.finalCertFile;
                break;
            default:
                throw new InvalidDBOperationError(kind, "get cert file");
        }
        return certFile;
    }

    @Override public void setCertFile(DatabaseKind kind, String certFile) {
        switch (kind) {
            case STAGING:
                this.stagingCertFile = certFile;
                break;
            case JOB:
                this.jobCertFile = certFile;
                break;
            case TRACE:
                this.jobCertFile = certFile;
                break;
            case FINAL:
                this.finalCertFile = certFile;
                break;
            default:
                throw new InvalidDBOperationError(kind, "set certificate file");
        }
    }

    @Override public String getCertPassword(DatabaseKind kind){
        String certPass;
        switch (kind) {
            case STAGING:
                certPass = this.stagingCertPassword;
                break;
            case JOB:
                certPass = this.jobCertPassword;
                break;
            case TRACE:
                certPass = this.jobCertPassword;
                break;
            case FINAL:
                certPass = this.finalCertPassword;
                break;
            default:
                throw new InvalidDBOperationError(kind, "get cert password");
        }
        return certPass;
    }

    @Override public void setCertPass(DatabaseKind kind, String certPassword) {
        switch (kind) {
            case STAGING:
                this.stagingCertPassword = certPassword;
                break;
            case JOB:
                this.jobCertPassword = certPassword;
                break;
            case TRACE:
                this.jobCertPassword = certPassword;
                break;
            case FINAL:
                this.finalCertPassword = certPassword;
                break;
            default:
                throw new InvalidDBOperationError(kind, "set certificate password");
        }
    }

    @Override public String getExternalName(DatabaseKind kind){
        String name;
        switch (kind) {
            case STAGING:
                name = this.stagingExternalName;
                break;
            case JOB:
                name = this.jobExternalName;
                break;
            case TRACE:
                name = this.jobExternalName;
                break;
            case FINAL:
                name = this.finalExternalName;
                break;
            default:
                throw new InvalidDBOperationError(kind, "get external name");
        }
        return name;
    }

    @Override public void setExternalName(DatabaseKind kind, String externalName) {
        switch (kind) {
            case STAGING:
                this.stagingExternalName = externalName;
                break;
            case JOB:
                this.jobExternalName = externalName;
                break;
            case TRACE:
                this.jobExternalName = externalName;
                break;
            case FINAL:
                this.finalExternalName = externalName;
                break;
            default:
                throw new InvalidDBOperationError(kind, "set auth method");
        }
    }

    // roles and users
    @Override public String getHubRoleName() {
        return hubRoleName;
    }
    @Override public void setHubRoleName(String hubRoleName) {
        this.hubRoleName = hubRoleName;
    }

    @Override public String getHubUserName() {
        return hubUserName;
    }

    // impl only pending refactor to Flow Component
    public String getMlUsername() {
        return mlUsername;
    }
    // impl only pending refactor to Flow Component
    public String getMlPassword() {
        return mlPassword;
    }
    
    public void setMlUsername(String mlUsername) {
        this.mlUsername = mlUsername;
    }

    public void setMlPassword(String mlPassword) {
        this.mlPassword = mlPassword;
    }
    @Override  public void setHubUserName(String hubUserName) {
        this.hubUserName = hubUserName;
    }


    @JsonIgnore
    @Override  public String getLoadBalancerHost() {
        return loadBalancerHost;
    }

    @Override
    public Boolean getIsHostLoadBalancer(){
        return isHostLoadBalancer;
    }

    @Override
    public Boolean getIsProvisionedEnvironment(){
        return isProvisionedEnvironment;
    }

    public void setLoadBalancerHost(String loadBalancerHost) {
        this.loadBalancerHost = loadBalancerHost;
    }

    @Override public String getCustomForestPath() {
        return customForestPath;
    }
    public void setCustomForestPath(String customForestPath) {
        this.customForestPath = customForestPath;
    }

    @Override public String getModulePermissions() {
        return modulePermissions;
    }

    @Override
    @Deprecated
    public String getProjectDir() {
        return hubProject.getProjectDirString();
    }

    @Override
    @Deprecated
    public void setProjectDir(String projectDir) {
        createProject(projectDir);
    }

    public void setModulePermissions(String modulePermissions) {
        this.modulePermissions = modulePermissions;
    }

    @JsonIgnore
    @Override  public HubProject getHubProject() {
        return this.hubProject;
    }

    @Override  public void initHubProject() {
        this.hubProject.init(getCustomTokens());
    }

    @Override
    @Deprecated
    public String getHubModulesDeployTimestampFile() {
        return hubProject.getHubModulesDeployTimestampFile();
    }

    @Override
    @Deprecated
    public String getUserModulesDeployTimestampFile() {
        return hubProject.getUserModulesDeployTimestampFile();
    }


    public void hydrateConfigs() {
        if (stagingSimpleSsl != null && stagingSimpleSsl) {
            stagingSslContext = SimpleX509TrustManager.newSSLContext();
            stagingSslHostnameVerifier = DatabaseClientFactory.SSLHostnameVerifier.ANY;
            stagingTrustManager = new SimpleX509TrustManager();
        }
        if (finalSimpleSsl != null && finalSimpleSsl) {
            finalSslContext = SimpleX509TrustManager.newSSLContext();
            finalSslHostnameVerifier = DatabaseClientFactory.SSLHostnameVerifier.ANY;
            finalTrustManager = new SimpleX509TrustManager();
        }
        if (jobSimpleSsl != null && jobSimpleSsl) {
            jobSslContext = SimpleX509TrustManager.newSSLContext();
            jobSslHostnameVerifier = DatabaseClientFactory.SSLHostnameVerifier.ANY;
            jobTrustManager = new SimpleX509TrustManager();
        }
        if (isHostLoadBalancer != null){
            if (isHostLoadBalancer) {
                if (host != null && loadBalancerHost != null){
                    logger.warn("\"mlLoadBalancerHosts\" is a deprecated property. When \"mlIsHostLoadBalancer\" is set to \"true\"properties, the value specified for \"mlHost\" will be used as the load balancer.");
                    if (!host.equals(loadBalancerHost)) {
                        throw new DataHubConfigurationException("\"mlLoadBalancerHosts\" must be the same as \"mlHost\"");
                    }
                    else {
                        loadBalancerHost = host;
                    }
                }
            }
            else {
                if (loadBalancerHost != null){
                    throw new DataHubConfigurationException("\"mlIsHostLoadBalancer\" must not be false if you are using \"mlLoadBalancerHosts\"");
                }
            }
        }
        else{
            if (host != null && loadBalancerHost != null){
                if (!host.equals(loadBalancerHost)) {
                    throw new DataHubConfigurationException("\"mlLoadBalancerHosts\" must be the same as \"mlHost\"");
                }
                else {
                    isHostLoadBalancer = true;
                    loadBalancerHost = host;
                }
            }
            else {
                isHostLoadBalancer = false;
            }
        }
    }


    public void loadConfigurationFromProperties(){
        loadConfigurationFromProperties(null, true);
    }

    public void loadConfigurationFromProperties(Properties properties, boolean loadGradleProperties) {
        projectProperties = new Properties();

        /*
         * Not sure if this code should still be here. We don't want to do this in a Gradle environment because the
         * properties have already been loaded and processed by the Gradle properties plugin, and they should be in
         * the incoming Properties object. So the use case for this would be when there's a gradle.properties file
         * available but Gradle isn't being used.
         */
        if (loadGradleProperties) {
            if (logger.isInfoEnabled()) {
                logger.info("Loading properties from gradle.properties");
            }
            File file = hubProject.getProjectDir().resolve("gradle.properties").toFile();
            loadPropertiesFromFile(file, projectProperties);

            if (envString != null) {
                File envPropertiesFile = hubProject.getProjectDir().resolve("gradle-" + envString + ".properties").toFile();
                if (envPropertiesFile != null && envPropertiesFile.exists()) {
                    if (logger.isInfoEnabled()) {
                        logger.info("Loading additional properties from " + envPropertiesFile.getAbsolutePath());
                    }
                    loadPropertiesFromFile(envPropertiesFile, projectProperties);
                }
            }
        }

        if (properties != null){
            properties.forEach(projectProperties::put);
        }

        host = host == null ? getEnvPropString(projectProperties, "mlHost", environment.getProperty("mlHost")) : host;
        stagingDbName = stagingDbName == null ? getEnvPropString(projectProperties, "mlStagingDbName", environment.getProperty("mlStagingDbName")) : stagingDbName;
        stagingHttpName = stagingHttpName == null ? getEnvPropString(projectProperties, "mlStagingAppserverName", environment.getProperty("mlStagingAppserverName")) : stagingHttpName;
        stagingForestsPerHost = stagingForestsPerHost == null ? getEnvPropInteger(projectProperties, "mlStagingForestsPerHost", Integer.parseInt(environment.getProperty("mlStagingForestsPerHost"))) : stagingForestsPerHost;
        stagingPort = stagingPort == null ? getEnvPropInteger(projectProperties, "mlStagingPort", Integer.parseInt(environment.getProperty("mlStagingPort"))) : stagingPort;
        stagingAuthMethod = stagingAuthMethod == null ? getEnvPropString(projectProperties, "mlStagingAuth", environment.getProperty("mlStagingAuth")) : stagingAuthMethod;
        stagingScheme = stagingScheme == null ? getEnvPropString(projectProperties, "mlStagingScheme", environment.getProperty("mlStagingScheme")) : stagingScheme;
        stagingSimpleSsl = stagingSimpleSsl == null ? getEnvPropBoolean(projectProperties, "mlStagingSimpleSsl", false) : stagingSimpleSsl;
        stagingCertFile = stagingCertFile == null ? getEnvPropString(projectProperties, "mlStagingCertFile", stagingCertFile) : stagingCertFile;
        stagingCertPassword = stagingCertPassword == null ? getEnvPropString(projectProperties, "mlStagingCertPassword", stagingCertPassword) : stagingCertPassword;
        stagingExternalName = stagingExternalName == null ? getEnvPropString(projectProperties, "mlStagingExternalName", stagingExternalName) : stagingExternalName;


        finalDbName = finalDbName == null ? getEnvPropString(projectProperties, "mlFinalDbName", environment.getProperty("mlFinalDbName")) : finalDbName;
        finalHttpName = finalHttpName == null ? getEnvPropString(projectProperties, "mlFinalAppserverName", environment.getProperty("mlFinalAppserverName")) : finalHttpName;
        finalForestsPerHost = finalForestsPerHost == null ? getEnvPropInteger(projectProperties, "mlFinalForestsPerHost", Integer.parseInt(environment.getProperty("mlFinalForestsPerHost"))) : finalForestsPerHost;
        finalPort = finalPort == null ? getEnvPropInteger(projectProperties, "mlFinalPort", Integer.parseInt(environment.getProperty("mlFinalPort"))) : finalPort;
        finalAuthMethod = finalAuthMethod == null ? getEnvPropString(projectProperties, "mlFinalAuth", environment.getProperty("mlFinalAuth")) : finalAuthMethod;
        finalScheme = finalScheme == null ? getEnvPropString(projectProperties, "mlFinalScheme", environment.getProperty("mlFinalScheme")) : finalScheme;
        finalSimpleSsl = finalSimpleSsl == null ? getEnvPropBoolean(projectProperties, "mlFinalSimpleSsl", false) : finalSimpleSsl;
        finalCertFile = finalCertFile == null ? getEnvPropString(projectProperties, "mlFinalCertFile", finalCertFile) : finalCertFile;
        finalCertPassword = finalCertPassword == null ? getEnvPropString(projectProperties, "mlFinalCertPassword", finalCertPassword) : finalCertPassword;
        finalExternalName = finalExternalName == null ? getEnvPropString(projectProperties, "mlFinalExternalName", finalExternalName) : finalExternalName;


        jobDbName = jobDbName == null ? getEnvPropString(projectProperties, "mlJobDbName", environment.getProperty("mlJobDbName")) : jobDbName;
        jobHttpName = jobHttpName == null ? getEnvPropString(projectProperties, "mlJobAppserverName", environment.getProperty("mlJobAppserverName")) : jobHttpName;
        jobForestsPerHost = jobForestsPerHost == null ? getEnvPropInteger(projectProperties, "mlJobForestsPerHost", Integer.parseInt(environment.getProperty("mlJobForestsPerHost"))) : jobForestsPerHost;
        jobPort = jobPort == null ? getEnvPropInteger(projectProperties, "mlJobPort", Integer.parseInt(environment.getProperty("mlJobPort"))) : jobPort;
        jobAuthMethod = jobAuthMethod == null ? getEnvPropString(projectProperties, "mlJobAuth", environment.getProperty("mlJobAuth")) : jobAuthMethod;
        jobScheme = jobScheme == null ? getEnvPropString(projectProperties, "mlJobScheme", environment.getProperty("mlJobScheme")) : jobScheme;
        jobSimpleSsl = jobSimpleSsl == null ? getEnvPropBoolean(projectProperties, "mlJobSimpleSsl", false) : jobSimpleSsl;
        jobCertFile = jobCertFile == null ? getEnvPropString(projectProperties, "mlJobCertFile", jobCertFile) : jobCertFile;
        jobCertPassword = jobCertPassword == null ? getEnvPropString(projectProperties, "mlJobCertPassword", jobCertPassword) : jobCertPassword;
        jobExternalName = jobExternalName == null ? getEnvPropString(projectProperties, "mlJobExternalName", jobExternalName) : jobExternalName;

        customForestPath = customForestPath == null ? getEnvPropString(projectProperties, "mlCustomForestPath", environment.getProperty("mlCustomForestPath")) : customForestPath;

        modulesDbName = modulesDbName == null ? getEnvPropString(projectProperties, "mlModulesDbName", environment.getProperty("mlModulesDbName")) : modulesDbName;
        modulesForestsPerHost = modulesForestsPerHost == null ? getEnvPropInteger(projectProperties, "mlModulesForestsPerHost", Integer.parseInt(environment.getProperty("mlModulesForestsPerHost"))) : modulesForestsPerHost;

        stagingTriggersDbName = stagingTriggersDbName == null ? getEnvPropString(projectProperties, "mlStagingTriggersDbName", environment.getProperty("mlStagingTriggersDbName")) : stagingTriggersDbName;
        stagingTriggersForestsPerHost = stagingTriggersForestsPerHost == null ? getEnvPropInteger(projectProperties, "mlStagingTriggersForestsPerHost", Integer.parseInt(environment.getProperty("mlStagingTriggersForestsPerHost"))) : stagingTriggersForestsPerHost;

        finalTriggersDbName = finalTriggersDbName == null ? getEnvPropString(projectProperties, "mlFinalTriggersDbName", environment.getProperty("mlFinalTriggersDbName")) : finalTriggersDbName;
        finalTriggersForestsPerHost = finalTriggersForestsPerHost == null ? getEnvPropInteger(projectProperties, "mlFinalTriggersForestsPerHost", Integer.parseInt(environment.getProperty("mlFinalTriggersForestsPerHost"))) : finalTriggersForestsPerHost;

        stagingSchemasDbName = stagingSchemasDbName == null ? getEnvPropString(projectProperties, "mlStagingSchemasDbName", environment.getProperty("mlStagingSchemasDbName")) : stagingSchemasDbName;
        stagingSchemasForestsPerHost = stagingSchemasForestsPerHost == null ? getEnvPropInteger(projectProperties, "mlStagingSchemasForestsPerHost", Integer.parseInt(environment.getProperty("mlStagingSchemasForestsPerHost"))) : stagingSchemasForestsPerHost;

        finalSchemasDbName = finalSchemasDbName == null ? getEnvPropString(projectProperties, "mlFinalSchemasDbName", environment.getProperty("mlFinalSchemasDbName")) : finalSchemasDbName;
        finalSchemasForestsPerHost = finalSchemasForestsPerHost == null ? getEnvPropInteger(projectProperties, "mlFinalSchemasForestsPerHost", Integer.parseInt(environment.getProperty("mlFinalSchemasForestsPerHost"))) : finalSchemasForestsPerHost;

        hubRoleName = hubRoleName == null ? getEnvPropString(projectProperties, "mlHubUserRole", environment.getProperty("mlHubUserRole")) : hubRoleName;
        hubUserName = hubUserName == null ? getEnvPropString(projectProperties, "mlHubUserName", environment.getProperty("mlHubUserName")) : hubUserName;

        modulePermissions = modulePermissions == null ? getEnvPropString(projectProperties, "mlModulePermissions", environment.getProperty("mlModulePermissions")) : modulePermissions;

        DHFVersion = getEnvPropString(projectProperties, "mlDHFVersion", environment.getProperty("mlDHFVersion"));

        // this is a runtime username/password for running flows
        // could be factored away with FlowRunner
        mlUsername = mlUsername == null ? getEnvPropString(projectProperties, "mlUsername", mlUsername) : mlUsername;
        mlPassword = mlPassword == null ? getEnvPropString(projectProperties, "mlPassword", mlPassword) : mlPassword;

        loadBalancerHost = loadBalancerHost == null ? getEnvPropString(projectProperties, "mlLoadBalancerHosts", null) : loadBalancerHost;
        isHostLoadBalancer = isHostLoadBalancer == null ? getEnvPropBoolean(projectProperties, "mlIsHostLoadBalancer", Boolean.parseBoolean(environment.getProperty("mlIsHostLoadBalancer"))) : isHostLoadBalancer;

        isProvisionedEnvironment = isProvisionedEnvironment == null ? getEnvPropBoolean(projectProperties, "mlIsProvisionedEnvironment", false) : isProvisionedEnvironment;

        // Need to do this first so that objects like the final SSL objects are set before hydrating AppConfig
        hydrateConfigs();

        hydrateAppConfigs(projectProperties);
    }

    private void hydrateAppConfigs(Properties properties) {
        com.marklogic.mgmt.util.PropertySource propertySource = properties::getProperty;
        hydrateAppConfigs(propertySource);
    }

    private void hydrateAppConfigs(Environment environment) {
        com.marklogic.mgmt.util.PropertySource propertySource = environment::getProperty;
        hydrateAppConfigs(propertySource);
    }

    private void hydrateAppConfigs(com.marklogic.mgmt.util.PropertySource propertySource) {
        if (appConfig != null) {
            setAppConfig(appConfig);
        }
        else {
            setAppConfig(new DefaultAppConfigFactory(propertySource).newAppConfig());
        }

        if (adminConfig != null) {
            setAdminConfig(adminConfig);
        }
        else {
            setAdminConfig(new DefaultAdminConfigFactory(propertySource).newAdminConfig());
        }

        if (adminManager != null) {
            setAdminManager(adminManager);
        }
        else {
            setAdminManager(new AdminManager(getAdminConfig()));
        }

        if (manageConfig != null) {
            setManageConfig(manageConfig);
        }
        else {
            setManageConfig(new DefaultManageConfigFactory(propertySource).newManageConfig());
        }

        if (manageClient != null) {
            setManageClient(manageClient);
        }
        else {
            setManageClient(new ManageClient(getManageConfig()));
        }
    }

    @JsonIgnore
    public ManageConfig getManageConfig() {
        return manageConfig;
    }
    public void setManageConfig(ManageConfig manageConfig) {
        this.manageConfig = manageConfig;
    }

    @JsonIgnore
    public ManageClient getManageClient() {
        return manageClient;
    }
    public void setManageClient(ManageClient manageClient) {
        this.manageClient = manageClient;
    }

    @JsonIgnore
    public AdminConfig getAdminConfig() { return adminConfig; }
    public void setAdminConfig(AdminConfig adminConfig) { this.adminConfig = adminConfig; }

    @JsonIgnore
    public AdminManager getAdminManager() {
        return adminManager;
    }
    public void setAdminManager(AdminManager adminManager) { this.adminManager = adminManager; }

    public DatabaseClient newAppServicesClient() {
        return getAppConfig().newAppServicesDatabaseClient(stagingDbName);
    }

    @Override
    public DatabaseClient newStagingClient() {
        return newStagingClient(stagingDbName);
    }

    private DatabaseClient newStagingClient(String dbName) {
        AppConfig appConfig = getAppConfig();
        DatabaseClientConfig config = new DatabaseClientConfig(appConfig.getHost(), stagingPort, getMlUsername(), getMlPassword());
        config.setDatabase(dbName);
        config.setSecurityContextType(SecurityContextType.valueOf(stagingAuthMethod.toUpperCase()));
        config.setSslHostnameVerifier(stagingSslHostnameVerifier);
        config.setSslContext(stagingSslContext);
        config.setCertFile(stagingCertFile);
        config.setCertPassword(stagingCertPassword);
        config.setExternalName(stagingExternalName);
        config.setTrustManager(stagingTrustManager);
        if (isHostLoadBalancer) {
            config.setConnectionType(DatabaseClient.ConnectionType.GATEWAY);
        }
        return appConfig.getConfiguredDatabaseClientFactory().newDatabaseClient(config);
    }

    @Override
    // this method uses STAGING appserver but FINAL database.
    // it's only use is for reverse flows, which need to use staging modules.
    public DatabaseClient newReverseFlowClient() {
        return newStagingClient(finalDbName);
    }

    @Override
    public DatabaseClient newFinalClient() {
        AppConfig appConfig = getAppConfig();
        DatabaseClientConfig config = new DatabaseClientConfig(appConfig.getHost(), finalPort, getMlUsername(), getMlPassword());
        config.setDatabase(finalDbName);
        config.setSecurityContextType(SecurityContextType.valueOf(finalAuthMethod.toUpperCase()));
        config.setSslHostnameVerifier(finalSslHostnameVerifier);
        config.setSslContext(finalSslContext);
        config.setCertFile(finalCertFile);
        config.setCertPassword(finalCertPassword);
        config.setExternalName(finalExternalName);
        config.setTrustManager(finalTrustManager);
        if (isHostLoadBalancer) {
            config.setConnectionType(DatabaseClient.ConnectionType.GATEWAY);
        }
        return appConfig.getConfiguredDatabaseClientFactory().newDatabaseClient(config);
    }

    public DatabaseClient newJobDbClient() {
        AppConfig appConfig = getAppConfig();
        DatabaseClientConfig config = new DatabaseClientConfig(appConfig.getHost(), jobPort, mlUsername, mlPassword);
        config.setDatabase(jobDbName);
        config.setSecurityContextType(SecurityContextType.valueOf(jobAuthMethod.toUpperCase()));
        config.setSslHostnameVerifier(jobSslHostnameVerifier);
        config.setSslContext(jobSslContext);
        config.setCertFile(jobCertFile);
        config.setCertPassword(jobCertPassword);
        config.setExternalName(jobExternalName);
        config.setTrustManager(jobTrustManager);
        if (isHostLoadBalancer) {
            config.setConnectionType(DatabaseClient.ConnectionType.GATEWAY);
        }
        return appConfig.getConfiguredDatabaseClientFactory().newDatabaseClient(config);
    }

    public DatabaseClient newTraceDbClient() {
        return newJobDbClient();
    }

    public DatabaseClient newModulesDbClient() {
        AppConfig appConfig = getAppConfig();
        // this has to be finalPort because final is a stock REST API.
        // staging will not be; but its rewriter isn't loaded yet.
        DatabaseClientConfig config = new DatabaseClientConfig(appConfig.getHost(), finalPort, mlUsername, mlPassword);
        config.setDatabase(appConfig.getModulesDatabaseName());
        config.setSecurityContextType(SecurityContextType.valueOf(finalAuthMethod.toUpperCase()));
        config.setSslHostnameVerifier(finalSslHostnameVerifier);
        config.setSslContext(finalSslContext);
        config.setCertFile(finalCertFile);
        config.setCertPassword(finalCertPassword);
        config.setExternalName(finalExternalName);
        config.setTrustManager(finalTrustManager);
        if (isHostLoadBalancer) {
            config.setConnectionType(DatabaseClient.ConnectionType.GATEWAY);
        }
        return appConfig.getConfiguredDatabaseClientFactory().newDatabaseClient(config);
    }

    @JsonIgnore
    @Override public Path getModulesDir() {
        return hubProject.getModulesDir();
    }

    @JsonIgnore
    public Path getHubProjectDir() { return hubProject.getProjectDir(); }

    @JsonIgnore
    @Override public Path getHubPluginsDir() {
        return hubProject.getHubPluginsDir();
    }

    @JsonIgnore
    @Override public Path getHubEntitiesDir() { return hubProject.getHubEntitiesDir(); }

    @JsonIgnore
    @Override public Path getHubMappingsDir() { return hubProject.getHubMappingsDir(); }

    @JsonIgnore
    @Override public Path getHubConfigDir() {
        return hubProject.getHubConfigDir();
    }

    @JsonIgnore
    @Override public Path getHubDatabaseDir() {
        return hubProject.getHubDatabaseDir();
    }

    @JsonIgnore
    @Override public Path getHubServersDir() {
        return hubProject.getHubServersDir();
    }

    @JsonIgnore
    @Override public Path getHubSecurityDir() {
        return hubProject.getHubSecurityDir();
    }

    @JsonIgnore
    @Override public Path getUserSecurityDir() {
        return hubProject.getUserSecurityDir();
    }

    @JsonIgnore
    @Override public Path getUserConfigDir() {
        return hubProject.getUserConfigDir();
    }

    @JsonIgnore
    @Override public Path getUserDatabaseDir() {
        return hubProject.getUserDatabaseDir();
    }

    @JsonIgnore
    @Override public Path getUserSchemasDir() { return hubProject.getUserSchemasDir(); }

    @JsonIgnore
    @Override public Path getEntityDatabaseDir() {
        return hubProject.getEntityDatabaseDir();
    }

    @JsonIgnore
    @Override public Path getUserServersDir() {
        return hubProject.getUserServersDir();
    }

    @JsonIgnore
    @Override public AppConfig getAppConfig() {
        return appConfig;
    }


    @Override public void setAppConfig(AppConfig config) {
        setAppConfig(config, false);
    }

    @Override public void setAppConfig(AppConfig config, boolean skipUpdate) {
        this.appConfig = config;
        if (!skipUpdate) {
            updateAppConfig(this.appConfig);
        }
    }

    @Override public String getJarVersion() {
        Properties properties = new Properties();
        InputStream inputStream = getClass().getClassLoader().getResourceAsStream("version.properties");
        try {
            properties.load(inputStream);
        } catch (IOException e)
        {
            throw new RuntimeException(e);
        }
        String version = (String)properties.get("version");

        // this lets debug builds work from an IDE
        if (version.equals("${project.version}")) {
            version = "4.0.SNAPSHOT";
        }
        return version;
    }

    @Override public String getDHFVersion() {

        return this.DHFVersion;
    }


    /* this method takes care of setting app config and other non-injected dependencies */
    public void initializeApplicationConfigurations() {
        hydrateAppConfigs(environment);
        hydrateConfigs();
    }

    private Map<String, String> getCustomTokens() {
        AppConfig appConfig = getAppConfig();
        return getCustomTokens(appConfig, appConfig.getCustomTokens());
    }

    private Map<String, String> getCustomTokens(AppConfig appConfig, Map<String, String> customTokens) {
        customTokens.put("%%mlHost%%", appConfig.getHost());
        customTokens.put("%%mlStagingAppserverName%%", environment.getProperty("mlStagingAppserverName"));
        customTokens.put("\"%%mlStagingPort%%\"", environment.getProperty("mlStagingPort"));
        customTokens.put("%%mlStagingDbName%%", environment.getProperty("mlStagingDbName"));
        customTokens.put("%%mlStagingForestsPerHost%%", environment.getProperty("mlStagingForestsPerHost"));
        customTokens.put("%%mlStagingAuth%%", environment.getProperty("mlStagingAuth"));

        customTokens.put("%%mlFinalAppserverName%%", environment.getProperty("mlFinalAppserverName"));
        customTokens.put("\"%%mlFinalPort%%\"", environment.getProperty("mlFinalPort"));
        customTokens.put("%%mlFinalDbName%%", environment.getProperty("mlFinalDbName"));
        customTokens.put("%%mlFinalForestsPerHost%%", environment.getProperty("mlFinalForestsPerHost"));
        customTokens.put("%%mlFinalAuth%%", environment.getProperty("mlFinalAuth"));


        customTokens.put("%%mlJobAppserverName%%", environment.getProperty("mlJobAppserverName"));
        customTokens.put("\"%%mlJobPort%%\"", environment.getProperty("mlJobPort"));
        customTokens.put("%%mlJobDbName%%", environment.getProperty("mlJobDbName"));
        customTokens.put("%%mlJobForestsPerHost%%", environment.getProperty("mlJobForestsPerHost"));
        customTokens.put("%%mlJobAuth%%", environment.getProperty("mlJobAuth"));

        customTokens.put("%%mlModulesDbName%%", environment.getProperty("mlModulesDbName"));
        customTokens.put("%%mlModulesForestsPerHost%%", environment.getProperty("mlModulesForestsPerHost"));

        customTokens.put("%%mlStagingTriggersDbName%%", environment.getProperty("mlStagingTriggersDbName"));
        customTokens.put("%%mlStagingTriggersForestsPerHost%%", environment.getProperty("mlStagingTriggersForestsPerHost"));

        customTokens.put("%%mlFinalTriggersDbName%%", environment.getProperty("mlFinalTriggersDbName"));
        customTokens.put("%%mlFinalTriggersForestsPerHost%%", environment.getProperty("mlFinalTriggersForestsPerHost"));

        customTokens.put("%%mlStagingSchemasDbName%%", environment.getProperty("mlStagingSchemasDbName"));
        customTokens.put("%%mlStagingSchemasForestsPerHost%%", environment.getProperty("mlStagingSchemasForestsPerHost"));

        customTokens.put("%%mlFinalSchemasDbName%%", environment.getProperty("mlFinalSchemasDbName"));
        customTokens.put("%%mlFinalSchemasForestsPerHost%%", environment.getProperty("mlFinalSchemasForestsPerHost"));

        customTokens.put("%%mlHubUserRole%%", environment.getProperty("mlHubUserRole"));
        customTokens.put("%%mlHubUserName%%", environment.getProperty("mlHubUserName"));

        customTokens.put("%%mlHubAdminRole%%", environment.getProperty("mlHubAdminRole"));
        customTokens.put("%%mlHubAdminUserName%%", environment.getProperty("mlHubAdminUserName"));

        // random password for hub user
        RandomStringGenerator randomStringGenerator = new RandomStringGenerator.Builder().withinRange(33, 126).filteredBy((CharacterPredicate) codePoint -> (codePoint != 92 && codePoint != 34)).build();
        customTokens.put("%%mlHubUserPassword%%", randomStringGenerator.generate(20));
        // and another random password for hub Admin User
        customTokens.put("%%mlHubAdminUserPassword%%", randomStringGenerator.generate(20));

        customTokens.put("%%mlCustomForestPath%%", environment.getProperty("mlCustomForestPath"));

        //version of DHF the user INTENDS to use
        customTokens.put("%%mlDHFVersion%%", getJarVersion());

        // in a load-from-properties situation we don't want a random string...
        if (projectProperties.containsKey("mlHubUserPassword")) {
            customTokens.put("%%mlHubUserPassword%%", projectProperties.getProperty("mlHubUserPassword"));
        }
        if (projectProperties.containsKey("mlHubAdminUserPassword")) {
            customTokens.put("%%mlHubAdminUserPassword%%", projectProperties.getProperty("mlHubAdminUserPassword"));
        }
        /* can't iterate through env properties, so rely on custom tokens itself?
        if (environment != null) {
            Enumeration keyEnum = environment.propertyNames();
            while (keyEnum.hasMoreElements()) {
                String key = (String) keyEnum.nextElement();
                if (key.matches("^ml[A-Z].+") && !customTokens.containsKey(key)) {
                    customTokens.put("%%" + key + "%%", (String) environmentProperties.get(key));
                }
            }
        }
        */

        return customTokens;
    }

    /**
     * Makes DHF-specific updates to the AppConfig, after it's been constructed by ml-gradle.
     *
     * @param config
     */
    private void updateAppConfig(AppConfig config) {
        // This shouldn't be used for any resource names, but it does appear in logging, and DHF is a better choice than "my-app"
        config.setName("DHF");

        // DHF never needs the default REST server provided by ml-gradle
        config.setNoRestServer(true);

        applyFinalConnectionSettingsToMlGradleDefaultRestSettings(config);

        config.setTriggersDatabaseName(finalTriggersDbName);
        config.setSchemasDatabaseName(finalSchemasDbName);
        config.setModulesDatabaseName(modulesDbName);

        config.setReplaceTokensInModules(true);
        config.setUseRoxyTokenPrefix(false);
        config.setModulePermissions(modulePermissions);

        Map<String, Integer> forestCounts = config.getForestCounts();
        forestCounts.put(jobDbName, jobForestsPerHost);
        forestCounts.put(modulesDbName, modulesForestsPerHost);
        forestCounts.put(stagingDbName, stagingForestsPerHost);
        forestCounts.put(stagingTriggersDbName, stagingTriggersForestsPerHost);
        forestCounts.put(stagingSchemasDbName, stagingSchemasForestsPerHost);
        forestCounts.put(finalDbName, finalForestsPerHost);
        forestCounts.put(finalTriggersDbName, finalTriggersForestsPerHost);
        forestCounts.put(finalSchemasDbName, finalSchemasForestsPerHost);
        config.setForestCounts(forestCounts);

        initializeConfigDirs(config);

        initializeModulePaths(config);

        config.setSchemasPath(getUserSchemasDir().toString());

        Map<String, String> customTokens = getCustomTokens(config, config.getCustomTokens());

        String version = getJarVersion();
        customTokens.put("%%mlHubVersion%%", version);

        appConfig = config;
    }

    /**
     * ml-app-deployer defaults to a single config path of src/main/ml-config. If that's still the only path present,
     * it's overridden with the DHF defaults - src/main/hub-internal-config first, then src/main/ml-config second, with
     * both of those being relative to the DHF project directory.
     *
     * But if the config paths have been customized - most likely via mlConfigPaths in gradle.properties - then this
     * method just ensures that they're relative to the DHF project directory.
     * 
     * @param config
     */
    protected void initializeConfigDirs(AppConfig config) {
        final String defaultConfigPath = String.join(File.separator, "src", "main", "ml-config");

        boolean configDirsIsSetToTheMlAppDeployerDefault = config.getConfigDirs().size() == 1 && config.getConfigDirs().get(0).getBaseDir().toString().endsWith(defaultConfigPath);

        if (configDirsIsSetToTheMlAppDeployerDefault) {
            List<ConfigDir> configDirs = new ArrayList<>();
            configDirs.add(new ConfigDir(getHubConfigDir().toFile()));
            configDirs.add(new ConfigDir(getUserConfigDir().toFile()));
            config.setConfigDirs(configDirs);
        }
        else {
            // Need to make each custom config dir relative to the project dir
            List<ConfigDir> configDirs = new ArrayList<>();
            for (ConfigDir configDir : config.getConfigDirs()) {
                File f = getHubProject().getProjectDir().resolve(configDir.getBaseDir().toString()).normalize().toAbsolutePath().toFile();
                configDirs.add(new ConfigDir(f));
            }
            config.setConfigDirs(configDirs);
        }

        if (logger.isInfoEnabled()) {
            config.getConfigDirs().forEach(configDir -> logger.info("Config path: " + configDir.getBaseDir().getAbsolutePath()));
        }
    }

    /**
     * Need to initialize every module path as being relative to the current project directory.
     *
     * @param config
     */
    protected void initializeModulePaths(AppConfig config) {
        List<String> modulePaths = new ArrayList<>();
        Path projectDir = getHubProject().getProjectDir();
        for (String modulePath : config.getModulePaths()) {
            modulePaths.add(projectDir.resolve(modulePath).normalize().toAbsolutePath().toString());
        }
        config.setModulePaths(modulePaths);
        if (logger.isInfoEnabled()) {
            logger.info("Module paths: " + modulePaths);
        }
    }

    /**
     * This is needed so that mlFinal* properties that configure the connection to the final REST server are also used
     * for any feature in ml-gradle that expects to use the same mlRest* properties. For example, LoadModulesCommand
     * uses those properties to construct a DatabaseClient for loading modules; we want to ensure that the properties
     * mirror the mlFinal* properties.
     *
     * @param config
     */
    private void applyFinalConnectionSettingsToMlGradleDefaultRestSettings(AppConfig config) {
        if (finalAuthMethod != null) {
            config.setRestSecurityContextType(SecurityContextType.valueOf(finalAuthMethod.toUpperCase()));
        }
        config.setRestPort(finalPort);
        config.setRestCertFile(finalCertFile);
        config.setRestCertPassword(finalCertPassword);
        config.setRestExternalName(finalExternalName);
        config.setRestSslContext(finalSslContext);
        config.setRestSslHostnameVerifier(finalSslHostnameVerifier);
        config.setRestTrustManager(finalTrustManager);
    }

    private String getEnvPropString(Properties properties, String key, String fallback) {
        String value = properties.getProperty(key);
        if (value == null) {
            value = fallback;
        }
        return value;
    }

    private int getEnvPropInteger(Properties properties, String key, int fallback) {
        String value = properties.getProperty(key);
        int res;
        if (value != null) {
            res = Integer.parseInt(value);
        }
        else {
            res = fallback;
        }
        return res;
    }

    private boolean getEnvPropBoolean(Properties properties, String key, boolean fallback) {
        String value = properties.getProperty(key);
        boolean res;
        if (value != null) {
            res = Boolean.parseBoolean(value);
        }
        else {
            res = fallback;
        }
        return res;
    }

    @JsonIgnore
    public String getInfo()
    {

        try {
            return objmapper.writerWithDefaultPrettyPrinter().writeValueAsString(this);
        }
        catch(Exception e)
        {
            throw new DataHubConfigurationException("Your datahub configuration could not serialize");

        }

    }

    @JsonIgnore
    public void refreshProject() {
        refreshProject(null, true);
    }

    @JsonIgnore
    public void refreshProject(Properties properties, boolean loadGradleProperties) {
        loadConfigurationFromProperties(properties, loadGradleProperties);

        flowManager.setupClient();
        dataHub.wireClient();
        versions.setupClient();
    }

    /**
     * It is not expected that a client would use this, as it would be partially re-inventing what the Gradle
     * properties plugin does. But it is being preserved for backwards compatibility in case any clients prior to
     * 4.1 were using HubConfigBuilder.withPropertiesFromEnvironment.
     *
     * @param environment
     * @return
     */
    @JsonIgnore
    public HubConfig withPropertiesFromEnvironment(String environment) {
        this.envString = environment;
        return this;
    }

    public String toString() {
        return getInfo();
    }

    // loads properties from a .properties file
    private void loadPropertiesFromFile(File propertiesFile, Properties loadedProperties) {
        InputStream is;
        try {
            if (propertiesFile.exists()) {
                is = new FileInputStream(propertiesFile);
                loadedProperties.load(is);
                is.close();
            }
        }
        catch (IOException e) {
            throw new DataHubProjectException("No properties file found in project " + hubProject.getProjectDirString());
        }
    }

    @Override
    public String getStagingSchemasDbName() {
        return this.stagingSchemasDbName;
    }
}
