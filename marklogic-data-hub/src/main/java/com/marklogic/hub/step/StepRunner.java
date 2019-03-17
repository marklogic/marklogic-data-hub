/*
 * Copyright 2012-2019 MarkLogic Corporation
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
package com.marklogic.hub.step;

import com.marklogic.client.DatabaseClient;
import com.marklogic.hub.flow.*;
import com.marklogic.hub.job.Job;


import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Executes a flow with options
 */
public interface StepRunner {

    /**
     * Sets the flow to be used with the flow runner
     * @param flow the flow object to be used
     * @return the flow runner object
     */
    StepRunner withFlow(Flow flow);

    /**
     * Sets the batch size for the flow runner
     * @param batchSize - the size of the batch in integer form
     * @return the flow runner object
     */
    StepRunner withBatchSize(int batchSize);

    /**
     * Sets the batch size for the flow runner
     * @param step - the step to be run in the flow
     * @return the flow runner object
     */

    StepRunner withStep(int step) ;

    /**
     * Sets the batch size for the flow runner
     * @param jobId - the id of the job
     * @return the flow runner object
     */

    StepRunner withJobId(String jobId) ;

    /**
     * Sets the thread count for the flowrunner
     * @param threadCount - the number of threads for the flow runner to use
     * @return the flow runner object
     */
    StepRunner withThreadCount(int threadCount);

    /**
     * Sets the source client on the flow runner. The source client determines which database to run against for building the envelope.
     * @param sourceClient - the client that will be used
     * @return  the flow runner object
     */
    StepRunner withSourceClient(DatabaseClient sourceClient);

    /**
     * Sets the database where flow output data will be persisted to
     * @param destinationDatabase - the name of the destination database
     * @return the flow runner object
     */
    StepRunner withDestinationDatabase(String destinationDatabase);

    /**
     * Sets the options to be passed into the xqy or sjs flow in the $options or options variables of main.
     * @param options - the object map of options as string/object pair
     * @return the flow runner object
     */
    StepRunner withOptions(Map<String, Object> options);

    /**
     * Sets if this will stop the job on a failure, or if it will continue on
     * @param stopOnFailure - true to stop the job if a failure happens
     * @return the flow runner object
     */
    StepRunner withStopOnFailure(boolean stopOnFailure);

    /**
     * Sets a listener on each item completing
     * @param listener the listen object to set
     * @return the flow runner object
     */
    StepRunner onItemComplete(StepItemCompleteListener listener);

    /**
     * Sets the failure listener for each item in the flow
     * @param listener the listener for the failures in the flow
     * @return the flow runner object
     */
    StepRunner onItemFailed(StepItemFailureListener listener);

    /**
     * Sets the status change listener on the flowrunner object
     * @param listener - the listener for when the status changes
     * @return the flow runner object
     */
    StepRunner onStatusChanged(StepStatusListener listener);

    /**
     * Sets the finished listener for when the item has processed (similar to a finally)
     * @param listener - the listener for the flow item when it finishes
     * @return the flow runner object
     */
    StepRunner onFinished(StepFinishedListener listener);

    /**
     * Blocks until the job is complete.
     */
    void awaitCompletion();

    /**
     * Blocks until the job is complete.
     *
     * @param timeout the maximum time to wait
     * @param unit the time unit of the timeout argument
     *
     * @throws InterruptedException if interrupted while waiting
     */
    void awaitCompletion(long timeout, TimeUnit unit) throws InterruptedException;

    /**
     * Runs the flow and creates the job
     * @return Job object for the flow that is run
     */
    Job run();
}
