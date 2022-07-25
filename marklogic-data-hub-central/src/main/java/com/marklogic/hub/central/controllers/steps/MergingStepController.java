package com.marklogic.hub.central.controllers.steps;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.marklogic.hub.MasteringManager;
import com.marklogic.hub.central.controllers.BaseController;
import com.marklogic.hub.central.schemas.StepSchema;
import com.marklogic.hub.dataservices.ArtifactService;
import com.marklogic.hub.dataservices.MasteringService;
import com.marklogic.hub.dataservices.StepService;
import com.marklogic.hub.impl.MasteringManagerImpl;
import io.swagger.annotations.ApiImplicitParam;
import io.swagger.annotations.ApiOperation;
import io.swagger.annotations.ApiParam;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.annotation.Secured;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;

@Controller
@RequestMapping("/api/steps/merging")
public class MergingStepController extends BaseController {

    private final static String STEP_DEFINITION_TYPE = "merging";

    @RequestMapping(method = RequestMethod.GET)
    @ResponseBody
    @ApiOperation(value = "Get all merging steps", response = MergingSteps.class)
    @Secured("ROLE_readMerging")
    public ResponseEntity<JsonNode> getSteps() {
        return ResponseEntity.ok(ArtifactService.on(getHubClient().getStagingClient()).getList(STEP_DEFINITION_TYPE));
    }

    @RequestMapping(value = "/{stepName}", method = RequestMethod.GET)
    @ApiOperation(value = "Get a step", response = StepSchema.class)
    @Secured("ROLE_readMerging")
    public ResponseEntity<JsonNode> getStep(@PathVariable String stepName) {
        return ResponseEntity.ok(newService().getStep(STEP_DEFINITION_TYPE, stepName));
    }

    @RequestMapping(method = RequestMethod.POST)
    @ApiImplicitParam(name = "step", required = true, paramType = "body", dataTypeClass = StepSchema.class)
    @Secured("ROLE_writeMerging")
    public ResponseEntity<Void> createMergingStep(@RequestBody @ApiParam(name = "step", hidden = true) ObjectNode propertiesToAssign) {
        String stepName = propertiesToAssign.get("name").asText();
        propertiesToAssign.put("name", stepName);
        newService().saveStep(STEP_DEFINITION_TYPE, propertiesToAssign, false, true);
        return emptyOk();
    }

    @RequestMapping(value = "/{stepName}", method = RequestMethod.PUT)
    @ApiImplicitParam(name = "step", required = true, paramType = "body", dataTypeClass = StepSchema.class)
    @Secured("ROLE_writeMerging")
    public ResponseEntity<Void> updateMergingStep(@RequestBody @ApiParam(name = "step", hidden = true) ObjectNode propertiesToAssign, @PathVariable String stepName) {
        propertiesToAssign.put("name", stepName);
        newService().saveStep(STEP_DEFINITION_TYPE, propertiesToAssign, false, false);
        return emptyOk();
    }

    @RequestMapping(value = "/{stepName}", method = RequestMethod.DELETE)
    @Secured("ROLE_writeMerging")
    public ResponseEntity<Void> deleteStep(@PathVariable String stepName) {
        newService().deleteStep(STEP_DEFINITION_TYPE, stepName);
        return emptyOk();
    }

    @RequestMapping(value = "/defaultCollections/{entityType}", method = RequestMethod.GET)
    @ResponseBody
    @ApiOperation("Returns the default mastering collections for an entity type")
    public JsonNode getDefaultCollections(@PathVariable String entityType) {
        return MasteringService
            .on(getHubClient().getStagingClient())
            .getDefaultCollections(entityType);
    }

    @RequestMapping(value = "/{stepName}/calculateMergingActivity", method = RequestMethod.GET)
    @ResponseBody
    @ApiOperation(value = "Information about merge step", response = CalculatedMergingActivity.class)
    @Secured("ROLE_readMerging")
    public ResponseEntity<JsonNode> calculateMergingActivity(@PathVariable String stepName) {
        return ResponseEntity.ok(
                MasteringService.on(getHubClient().getFinalClient())
                        .calculateMergingActivity(stepName)
               );
    }

    @RequestMapping(value = "/{stepName}/validate", method = RequestMethod.GET)
    @ResponseBody
    @ApiOperation(value = "Validate the merging step")
    @Secured("ROLE_readMerging")
    public ResponseEntity<JsonNode> validateMergingStep(@PathVariable String stepName, @RequestParam(required = false, defaultValue = "settings") String view, @RequestParam(required = false) String entityPropertyPath) {
        return ResponseEntity.ok(MasteringService.on(getHubClient().getFinalClient()).validateMergingStep(stepName, view, entityPropertyPath));
    }

    @RequestMapping(value = "/unmerge", method = RequestMethod.PUT)
    @Secured("ROLE_readMerging")
    public ResponseEntity<JsonNode> unmergeDocument(@PathVariable String mergeDocumentURI, @RequestParam(required = false, defaultValue = "true") Boolean retainAuditTrail, @RequestParam(required = false, defaultValue = "true") Boolean blockFutureMerges) {
        MasteringManager mgr = new MasteringManagerImpl(getHubClient());
        return ResponseEntity.ok(mgr.unmerge(mergeDocumentURI, retainAuditTrail, blockFutureMerges));
    }

    private StepService newService() {
        return StepService.on(getHubClient().getStagingClient());
    }

    public static class MergingSteps extends ArrayList<StepSchema> {
    }

    public static class CalculatedMergingActivity {
        public ArrayList<String> sourceNames;
    }

}
