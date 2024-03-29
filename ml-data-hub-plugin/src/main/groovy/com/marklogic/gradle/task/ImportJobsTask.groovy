/*
 * Copyright (c) 2021 MarkLogic Corporation
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

import org.gradle.api.tasks.Input
import org.gradle.api.tasks.Optional
import org.gradle.api.tasks.TaskAction

class ImportJobsTask extends HubTask {
    @Input
    @Optional
    String filename

    @TaskAction
    void importJobs() {
        if (filename == null) {
            filename = project.hasProperty("filename") ? project.property("filename") : "jobexport.zip"
        }
        println("Importing jobs from " + filename)

        def jobManager = getJobManager()
        def dh = getDataHub()
        if (!isHubInstalled()) {
            println("Data Hub is not installed.")
            return
        }
        def importPath = getHubConfig().hubConfigDir.parent.resolve(filename)
        jobManager.importJobs(importPath)
    }

}
