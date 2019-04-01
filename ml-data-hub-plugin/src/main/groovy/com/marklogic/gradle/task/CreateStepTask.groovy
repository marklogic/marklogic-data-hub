/*
 * Copyright 2012-2019 MarkLogic Corporation
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

package com.marklogic.gradle.task

import com.marklogic.gradle.exception.StepAlreadyPresentException
import com.marklogic.gradle.exception.StepNameRequiredException
import com.marklogic.hub.StepManager
import com.marklogic.hub.scaffold.Scaffolding
import com.marklogic.hub.step.Step
import org.gradle.api.tasks.TaskAction

class CreateStepTask extends HubTask {

    @TaskAction
    void createStep() {
        def propName = "stepName"
        def propType = "stepType"

        String stepName = project.hasProperty(propName) ? project.property(propName) : null
        if (stepName == null) {
            throw new StepNameRequiredException()
        }
        String stepType = project.hasProperty(propType) ? project.property(propType) : Step.StepType.CUSTOM

        def projectDir = getHubConfig().getHubProject().getProjectDirString()
        println "stepName: " + stepName
        println "stepType: " + stepType
        println "projectDir: " + projectDir.toString()

        StepManager stepManager = getStepManager()
        Step step = Step.create(stepName.toString(), Step.StepType.getStepType(stepType))

        if (stepManager.getStep(step.name, step.type) == null) {
            Scaffolding scaffolding = getScaffolding()
            scaffolding.createCustomModule(stepName, stepType)

            step.setModulePath("/custom-modules/" + stepType.toLowerCase() + "/" + stepName + "/main.sjs")

            stepManager.saveStep(step)
        } else {
            throw new StepAlreadyPresentException()
        }

    }
}
