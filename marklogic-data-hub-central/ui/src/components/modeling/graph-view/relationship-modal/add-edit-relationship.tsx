import React, {useState, useEffect, useContext} from "react";
import {ModelingContext} from "../../../../util/modeling-context";
import {Modal, Input, Select, Icon, Card, Button, Tooltip} from "antd";
import styles from "./add-edit-relationship.module.scss";
// import graphConfig from "../../../../config/graph-vis.config";
import oneToManyIcon from "../../../../assets/one-to-many.svg";
import oneToOneIcon from "../../../../assets/one-to-one.svg";
import {faTrashAlt} from "@fortawesome/free-solid-svg-icons";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {ModelingTooltips} from "../../../../config/tooltips.config";
import ConfirmationModal from "../../../confirmation-modal/confirmation-modal";
import {ConfirmationType} from "../../../../types/common-types";
import {getSystemInfo} from "../../../../api/environment";
import {entityReferences} from "../../../../api/modeling";
import {
  PropertyOptions,
  PropertyType,
  EntityModified
} from "../../../../types/modeling-types";

type Props = {
  openRelationshipModal: boolean;
  setOpenRelationshipModal: (boolean) => (void);
  isEditing: boolean;
  relationshipInfo: any;
  entityTypes: any;
  relationshipModalVisible: any;
  toggleRelationshipModal: any;
  updateSavedEntity: any;
  canReadEntityModel: any;
  canWriteEntityModel: any;
}

const {Option} = Select;
const NAME_REGEX = new RegExp("^[A-Za-z][A-Za-z0-9_-]*$");

const AddEditRelationship: React.FC<Props> = (props) => {

  // const headerText = !props.isEditing ? "Set the cardinality and name of the relationship. Now or in the future, you can also select the join property or swap the entity type that the relationship comes from." :
  //   <span className={styles.headerText}><Icon type="exclamation-circle" className={styles.headerWarning}/>This relationship cannot be published until a join property is selected.</span>;

  const [relationshipName, setRelationshipName] = useState(""); //set default value when editing
  const [joinPropertyValue, setJoinPropertyValue] = useState("");  //set default value when editing
  const [submitClicked, setSubmitClicked] = useState(false);
  const [oneToManySelected, setOneToManySelected] = useState(false); //set default value when editing
  const [errorMessage, setErrorMessage] = useState("");
  const [targetNodeJoinProperties, setTargetNodeJoinProperties] = useState<any[]>([]);
  const [defaultCardinality, setDefaultCardinality] = useState(false);
  const {modelingOptions, updateEntityModified} = useContext(ModelingContext);
  const [loading, toggleLoading] = useState(false);
  const [showConfirmModal, toggleConfirmModal] = useState(false);
  const [confirmType, setConfirmType] = useState<ConfirmationType>(ConfirmationType.Identifer);
  const [confirmBoldTextArray, setConfirmBoldTextArray] = useState<string[]>([]);
  const [stepValuesArray, setStepValuesArray] = useState<string[]>([]);
  const [modifiedEntity, setModifiedEntity] = useState({entityName: "", modelDefinition: ""});

  const initRelationship = (sourceEntityIdx) => {
    let sourceEntityDetails = props.entityTypes[sourceEntityIdx];
    if (props.relationshipInfo.relationshipName) {
      setRelationshipName(props.relationshipInfo.relationshipName);
    }
    setJoinPropertyValue(props.relationshipInfo.joinPropertyName);

    if (sourceEntityDetails.model.definitions[props.relationshipInfo.sourceNodeName].properties[props.relationshipInfo.relationshipName]?.hasOwnProperty("items")) {
      //set cardinality selection to "multiple"
      setDefaultCardinality(true);
      setOneToManySelected(true);
    }
  };

  useEffect(() => {
    if (props.entityTypes.length > 0 && JSON.stringify(props.relationshipInfo) !== "{}") {
      let targetEntityIdx = props.entityTypes.findIndex(obj => obj.entityName === props.relationshipInfo.targetNodeName);
      let sourceEntityIdx = props.entityTypes.findIndex(obj => obj.entityName === props.relationshipInfo.sourceNodeName);

      createJoinMenu(targetEntityIdx);
      if (props.isEditing) {
        initRelationship(sourceEntityIdx);
      }
    }
  }, [props.entityTypes, props.relationshipInfo]);

  useEffect(() => {
    if (!props.relationshipModalVisible) {
      toggleLoading(false);
      props.setOpenRelationshipModal(false);
      props.toggleRelationshipModal(true);
    }
  }, [props.relationshipModalVisible]);

  const createJoinMenu = (entityIdx) => {
    let targetEntityDetails, entityUpdated, modelUpdated, menuProps, model;
    targetEntityDetails = props.entityTypes[entityIdx];
    model = targetEntityDetails.model.definitions[props.relationshipInfo.targetNodeName];
    entityUpdated = modelingOptions.modifiedEntitiesArray.find(ent => ent.entityName === props.relationshipInfo.targetNodeName);
    // Modified model data (if present)
    if (entityUpdated) {
      modelUpdated = entityUpdated.modelDefinition[props.relationshipInfo.targetNodeName];
    }
    menuProps = getJoinMenuProps(model, modelUpdated);
    // setTargetNodeJoinProperties(Object.keys(targetEntityDetails.model.definitions[props.relationshipInfo.targetNodeName].properties));
    setTargetNodeJoinProperties(menuProps);
  };

  const getJoinMenuProps = (model, modelUpdated) => {
    let alreadyAdded: string[] = [], result;
    // Check each property from saved model and build menu items
    if (model) {
      result = Object.keys(model.properties).map(key => {
        alreadyAdded.push(key);
        // Structured property case
        if (model.properties[key].hasOwnProperty("$ref")) {
          return {
            value: key,
            label: key,
            type: "", // TODO
            disabled: true,
            // TODO Support structure properties
            // children: getJoinProps(...)
          };
        } else if (model.properties[key]["datatype"] === "array") {
          // Array property case
          return {
            value: key,
            label: key,
            type: "", // TODO
            disabled: true
          };
        } else {
          // Default case
          return {
            value: key,
            label: key,
            type: model.properties[key].datatype
          };
        }
      });
    }
    // Include any new properties from updated model object
    if (modelUpdated) {
      Object.keys(modelUpdated?.properties).map(key => {
        if (!alreadyAdded.includes(key)) {
          result.push({
            value: key,
            label: key,
            type: modelUpdated.properties[key].datatype,
            disabled: true
          });
        }
      });
    }
    return result;
  };

  const getPropertyType = (joinPropName, targetNodeName) => {
    let targetEntityIdx = props.entityTypes.findIndex(obj => obj.entityName === targetNodeName);
    let targetEntityDetails = props.entityTypes[targetEntityIdx];
    return targetEntityDetails.model.definitions[targetNodeName].properties[joinPropName].datatype;
  };

  const createPropertyDefinitionPayload = (propertyOptions: PropertyOptions) => {
    let multiple = propertyOptions.multiple === "yes" ? true : false;
    let facetable = propertyOptions.facetable;
    let sortable = propertyOptions.sortable;

    if (propertyOptions.propertyType === PropertyType.RelatedEntity && !multiple) {
      let externalEntity = modelingOptions.entityTypeNamesArray.find(entity => entity.name === propertyOptions.type);
      return {
        datatype: propertyOptions.joinPropertyType,
        relatedEntityType: externalEntity.entityTypeId,
        joinPropertyName: propertyOptions.joinPropertyName,
        //joinPropertyType: propertyOptions.joinPropertyType
      };

    } else if (propertyOptions.propertyType === PropertyType.RelatedEntity && multiple) {
      let externalEntity = modelingOptions.entityTypeNamesArray.find(entity => entity.name === propertyOptions.type);
      return {
        datatype: "array",
        facetable: facetable,
        sortable: sortable,
        items: {
          datatype: propertyOptions.joinPropertyType,
          relatedEntityType: externalEntity.entityTypeId,
          joinPropertyName: propertyOptions.joinPropertyName,
          //joinPropertyType: propertyOptions.joinPropertyType
        }
      };

    } else if (propertyOptions.propertyType === PropertyType.Structured && !multiple) {
      return {
        $ref: "#/definitions/" + propertyOptions.type,
      };

    } else if (propertyOptions.propertyType === PropertyType.Structured && multiple) {
      return {
        datatype: "array",
        facetable: facetable,
        sortable: sortable,
        items: {
          $ref: "#/definitions/" + propertyOptions.type,
        }
      };

    } else if (propertyOptions.propertyType === PropertyType.Basic && multiple) {
      return {
        datatype: "array",
        facetable: facetable,
        sortable: sortable,
        items: {
          datatype: propertyOptions.type,
          collation: "http://marklogic.com/collation/codepoint",
        }
      };
    } else if (propertyOptions.propertyType === PropertyType.Basic && !multiple) {
      return {
        datatype: propertyOptions.type,
        facetable: facetable,
        sortable: sortable,
        collation: "http://marklogic.com/collation/codepoint"
      };
    }
  };

  const editPropertyUpdateDefinition = (entityIdx: number, definitionName: string, propertyName: string, editPropertyOptions) => {
    let parseName = definitionName.split(",");
    let parseDefinitionName = parseName[parseName.length - 1];
    let updatedDefinitions = {...props.entityTypes[entityIdx].model.definitions};
    let entityTypeDefinition = updatedDefinitions[parseDefinitionName];
    let newProperty = createPropertyDefinitionPayload(editPropertyOptions.propertyOptions);

    entityTypeDefinition["properties"][propertyName] = newProperty;

    if (editPropertyOptions.propertyOptions.identifier === "yes") {
      entityTypeDefinition.primaryKey = editPropertyOptions.name;
    } else if (entityTypeDefinition.hasOwnProperty("primaryKey") && entityTypeDefinition.primaryKey === propertyName) {
      delete entityTypeDefinition.primaryKey;
    }

    if (editPropertyOptions.propertyOptions.pii === "yes") {
      let index = entityTypeDefinition.pii?.indexOf(propertyName);
      if (index > -1) {
        entityTypeDefinition.pii[index] = editPropertyOptions.name;
      } else {
        if (entityTypeDefinition.hasOwnProperty("pii")) {
          entityTypeDefinition.pii.push(editPropertyOptions.name);
        } else {
          entityTypeDefinition.pii = [editPropertyOptions.name];
        }
      }
    } else {
      let index = entityTypeDefinition.pii?.indexOf(propertyName);
      if (index > -1) {
        entityTypeDefinition.pii.splice(index, 1);
      }
    }

    if (propertyName !== editPropertyOptions.name) {
      let reMapDefinition = Object.keys(entityTypeDefinition["properties"]).map((key) => {
        const newKey = key === propertyName ? editPropertyOptions.name : key;
        const value = key === propertyName ? newProperty : entityTypeDefinition["properties"][key];
        return {[newKey]: value};
      });
      entityTypeDefinition["properties"] = reMapDefinition.reduce((a, b) => Object.assign({}, a, b));

      if (entityTypeDefinition.hasOwnProperty("required") && entityTypeDefinition.required.some(value => value === propertyName)) {
        let index = entityTypeDefinition.required.indexOf(propertyName);
        entityTypeDefinition.required[index] = editPropertyOptions.name;
      }
      if (entityTypeDefinition.hasOwnProperty("rangeIndex") && entityTypeDefinition.rangeIndex.some(value => value === propertyName)) {
        let index = entityTypeDefinition.rangeIndex.indexOf(propertyName);
        entityTypeDefinition.rangeIndex[index] = editPropertyOptions.name;
      }
      if (entityTypeDefinition.hasOwnProperty("pathRangeIndex") && entityTypeDefinition.pathRangeIndex.some(value => value === propertyName)) {
        let index = entityTypeDefinition.pathRangeIndex.indexOf(propertyName);
        entityTypeDefinition.pathRangeIndex[index] = editPropertyOptions.name;
      }
      if (entityTypeDefinition.hasOwnProperty("elementRangeIndex") && entityTypeDefinition.elementRangeIndex.some(value => value === propertyName)) {
        let index = entityTypeDefinition.elementRangeIndex.indexOf(propertyName);
        entityTypeDefinition.elementRangeIndex[index] = editPropertyOptions.name;
      }
      if (entityTypeDefinition.hasOwnProperty("wordLexicon") && entityTypeDefinition.wordLexicon.some(value => value === propertyName)) {
        let index = entityTypeDefinition.wordLexicon.indexOf(propertyName);
        entityTypeDefinition.wordLexicon[index] = editPropertyOptions.name;
      }
    }

    updatedDefinitions[parseDefinitionName] = entityTypeDefinition;

    let modifiedEntityStruct: EntityModified = {
      entityName: definitionName,
      modelDefinition: updatedDefinitions
    };

    return modifiedEntityStruct;
  };

  const onCancel = () => {
    if (!loading) {
      setErrorMessage("");
      props.toggleRelationshipModal(true);
      props.setOpenRelationshipModal(false);
      setSubmitClicked(false);
    }
  };

  const onSubmit = () => {
    setSubmitClicked(true);
    if (props.isEditing && errorMessage === "") {
      let sourceEntityIdx = props.entityTypes.findIndex(obj => obj.entityName === props.relationshipInfo.sourceNodeName);
      let sourceProperties = props.entityTypes[sourceEntityIdx].model.definitions[props.relationshipInfo.sourceNodeName].properties;
      let propertyNamesArray = Object.keys(sourceProperties).filter(propertyName => propertyName !== props.relationshipInfo.relationshipName);
      if (propertyNamesArray.includes(relationshipName)) {
        setErrorMessage(`A property already exists with a name of ${relationshipName}`);
      } else {

        const newEditPropertyOptions = {
          name: relationshipName,
          isEdit: true,
          propertyOptions: {
            facetable: false,
            identifier: "no",
            joinPropertyName: joinPropertyValue,
            joinPropertyType: getPropertyType(joinPropertyValue, props.relationshipInfo.targetNodeName),
            multiple: oneToManySelected ? "yes" : "no",
            pii: "no",
            propertyType: "relatedEntity",
            sortable: false,
            type: props.relationshipInfo.targetNodeName
          }
        };

        //do not enter loading save if no changes have been made
        if (joinPropertyValue === props.relationshipInfo.joinPropertyName && relationshipName === props.relationshipInfo.relationshipName && defaultCardinality === oneToManySelected) {
          toggleLoading(false);
          props.setOpenRelationshipModal(false);
        } else {
          toggleLoading(true);
          let entityModified = editPropertyUpdateDefinition(sourceEntityIdx, props.relationshipInfo.sourceNodeName, props.relationshipInfo.relationshipName, newEditPropertyOptions);
          updateEntityModified(entityModified);
          props.updateSavedEntity([entityModified]);
        }
        setErrorMessage("");
        setSubmitClicked(false);
      }
    }
  };

  const toggleCardinality = () => {
    if (oneToManySelected) {
      setOneToManySelected(false);
    } else {
      setOneToManySelected(true);
    }
  };

  const handleChange = (event) => {
    if (event.target.id === "relationship") {
      setRelationshipName(event.target.value);
      if (event.target.value === "") {
        setErrorMessage(ModelingTooltips.relationshipEmpty);
      } else if (!NAME_REGEX.test(event.target.value)) {
        setErrorMessage(ModelingTooltips.nameRegex);
      } else {
        setErrorMessage("");
      }
    }
  };

  const handleOptionSelect = (value) => {
    setJoinPropertyValue(value);
  };

  const joinPropertyDropdown = (
    <Select
      placeholder="Join Property"
      id="join-property-dropdown"
      data-testid="join-property-dropdown"
      value={joinPropertyValue}
      onChange={value => handleOptionSelect(value)}
      className={styles.joinPropertyDropdown}
      showArrow={true}
      size={"small"}
    >
      {
        targetNodeJoinProperties.length > 0 && targetNodeJoinProperties.map((prop, index) => (
          <Option key={`${prop.label}-option`} value={prop.value} disabled={prop.disabled} aria-label={`${prop.label}-option`}>{prop.label}</Option>
        ))
      }
    </Select>
  );

  const deleteEntityProperty= async () => {
    let entityName = props.relationshipInfo.sourceNodeName;
    let propertyName = props.relationshipInfo.relationshipName;
    const response = await entityReferences(entityName, propertyName);
    if (response !== undefined && response["status"] === 200) {
      let newConfirmType = ConfirmationType.DeletePropertyWarn;
      let boldText: string[] = [propertyName];
      if (response["data"]["entityNamesWithForeignKeyReferences"].length > 0) {
        boldText.push(entityName);
        newConfirmType = ConfirmationType.DeleteEntityPropertyWithForeignKeyReferences;
        setStepValuesArray(response["data"]["entityNamesWithForeignKeyReferences"]);
      } else if (response["data"]["stepNames"].length > 0) {
        boldText.push(entityName);
        newConfirmType = ConfirmationType.DeletePropertyStepWarn;
        setStepValuesArray(response["data"]["stepNames"]);
      }
      setConfirmBoldTextArray(boldText);
      setConfirmType(newConfirmType);
      toggleConfirmModal(true);
    }
    let sourceEntityName = props.relationshipInfo.sourceNodeName;
    let entityTypeDefinition;
    let updatedDefinitions;
    for (let i = 0; i < props.entityTypes.length; i++) {
      if (props.entityTypes[i].entityName === sourceEntityName) {
        updatedDefinitions = {...props.entityTypes[i].model};
        entityTypeDefinition = props.entityTypes[i].model.definitions[sourceEntityName];
      }
    }
    delete entityTypeDefinition["properties"][propertyName];
    updatedDefinitions[sourceEntityName] = entityTypeDefinition;
    let entityModifiedInfo: EntityModified = {
      entityName: sourceEntityName,
      modelDefinition: updatedDefinitions.definitions
    };
    setModifiedEntity(entityModifiedInfo);
    updateEntityModified(modifiedEntity);
  };

  const modalFooter = <div className={styles.modalFooter}>
    <div className={styles.deleteTooltip}>
      <Tooltip title={ModelingTooltips.deleteRelationshipIcon} placement="top">
        <i key="last" role="delete-entity button" data-testid={"delete-relationship"}>
          <FontAwesomeIcon className={!props.canWriteEntityModel && props.canReadEntityModel ? styles.iconTrashReadOnly : styles.deleteIcon} size="lg"
            icon={faTrashAlt}
            onClick={(event) => {
              if (!props.canWriteEntityModel && props.canReadEntityModel) {
                return event.preventDefault();
              } else {
                deleteEntityProperty();
              }
            }} />
        </i>
      </Tooltip>
    </div>
    <Button
      aria-label="relationship-modal-cancel"
      size="default"
      onClick={onCancel}
    >Cancel</Button>
    <Button
      aria-label="relationship-modal-submit"
      form="property-form"
      type="primary"
      htmlType="submit"
      size="default"
      loading={loading}
      onClick={onSubmit}
    >{props.isEditing ? "Save" : "Add"}</Button>
  </div>;

  const confirmAction = async () => {
    await props.updateSavedEntity([modifiedEntity]);
    await getSystemInfo();
    toggleConfirmModal(false);
  };


  return (<Modal
    visible={props.openRelationshipModal}
    title={<span aria-label="relationshipHeader">{props.isEditing ? "Edit Relationship" : "Add a Relationship"}</span>}
    width="960px"
    onCancel={onCancel}
    footer={modalFooter}
    maskClosable={false}
    destroyOnClose={true}
  >
    <div aria-label="relationshipModal" id="relationshipModal" className={styles.relationshipModalContainer}>
      {/* Add in header text when implementing "Add a relationship"
      <div aria-label="headerMessage">
      {headerText}
      </div>
    */}
      <div aria-label="relationshipActions" className={styles.relationshipDisplay}>
        <div className={styles.nodeDisplay}>
          <span className={styles.nodeLabel}>SOURCE</span>
          <Card style={{width: 200, backgroundColor: props.relationshipInfo.sourceNodeColor}}>
            <p data-testid="sourceNodeName" className={styles.entityName}><b>{props.relationshipInfo.sourceNodeName}</b></p>
          </Card>
        </div>
        <div className={styles.relationshipInputContainer}>
          <Input
            id="relationship"
            placeholder= "Relationship"
            value={relationshipName}
            onChange={handleChange}
            size={"small"}
            // disabled={!canReadWrite}
            className={styles.relationshipInput}
            aria-label="relationship-textarea"
            style={errorMessage && submitClicked? {border: "solid 1px #C00"} : {}}
          />
          {errorMessage && submitClicked? <Tooltip title={errorMessage} placement={"bottom"}><Icon aria-label="error-circle" type="exclamation-circle" theme="filled" className={styles.errorIcon}/></Tooltip> : ""}
          <Tooltip title={ModelingTooltips.relationshipNameInfo(props.relationshipInfo.sourceNodeName)} placement={"bottom"}>
            <Icon type="question-circle" className={styles.questionCircle} theme="filled"/>
          </Tooltip>
        </div>
        <hr className={styles.horizontalLine}></hr>
        <Tooltip title={ModelingTooltips.cardinalityButton} placement={"bottom"}>
          <Button className={styles.cardinalityButton} data-testid="cardinalityButton" onClick={() => toggleCardinality()}>
            {oneToManySelected ? <img data-testid="oneToManyIcon" className={styles.oneToManyIcon} src={oneToManyIcon} alt={""} onClick={() => toggleCardinality()}/> : <img data-testid="oneToOneIcon" className={styles.oneToOneIcon} src={oneToOneIcon} alt={""} onClick={() => toggleCardinality()}/>}
          </Button>
        </Tooltip>
        <div className={styles.joinPropertyDropdownContainer}>
          {joinPropertyDropdown}
          <Tooltip title={ModelingTooltips.joinPropertyInfo} placement={"bottom"}>
            <Icon type="question-circle" className={styles.questionCircle} theme="filled"/>
          </Tooltip>
        </div>
        <div className={styles.nodeDisplay}>
          <span className={styles.nodeLabel}>TARGET</span>
          <Card style={{width: 200, backgroundColor: props.relationshipInfo.targetNodeColor}}>
            <p  data-testid="targetNodeName" className={styles.entityName}><b>{props.relationshipInfo.targetNodeName}</b></p>
          </Card>
        </div>
      </div>
    </div>
    <ConfirmationModal
      isVisible={showConfirmModal}
      type={confirmType}
      boldTextArray={confirmBoldTextArray}
      arrayValues={stepValuesArray}
      toggleModal={toggleConfirmModal}
      confirmAction={confirmAction}
    />
  </Modal>);

};

export default AddEditRelationship;