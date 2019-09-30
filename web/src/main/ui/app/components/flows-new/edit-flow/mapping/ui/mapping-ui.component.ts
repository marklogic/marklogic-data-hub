import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, ViewChild, ViewChildren, QueryList, ViewEncapsulation } from '@angular/core';
import { Entity } from '../../../../../models/index';
import { MdlDialogService } from '@angular-mdl/core';

import * as _ from 'lodash';
import * as moment from 'moment';
import { Mapping } from "../../../../mappings/mapping.model";
import { EnvironmentService } from '../../../../../services/environment';
import {MatDialog, MatPaginator, MatSort, MatTable, MatTableDataSource} from "@angular/material";
import { Step } from '../../../models/step.model';
import {animate, state, style, transition, trigger} from '@angular/animations';

//import { ManageFlowsService } from "../../../services/manage-flows.service";

@Component({
  selector: 'app-mapping-ui',
  templateUrl: './mapping-ui.component.html',
  styleUrls: ['./mapping-ui.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0', visibility: 'hidden' })),
      state('expanded', style({ height: '*', visibility: 'visible' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
  
})
export class MappingUiComponent implements OnChanges {

  @Input() mapping: Mapping = new Mapping();
  @Input() targetEntity: Entity = null;
  @Input() conns: object = {};
  @Input() sampleDocSrcProps: Array<any>;
  @Input() editURIVal: string = '';
  @Input() step: Step;
  @Input() functionLst: object;
  @Input() nestEnt: Entity;
  @Output() updateURI = new EventEmitter();
  @Output() updateMap = new EventEmitter();
  @Output() nestEntity = new EventEmitter();

  private uriOrig: string = '';
  private connsOrig: object = {};

  public valMaxLen: number = 15;
  public isVersionCompatibleWithES: boolean = false;

  public filterFocus: object = {};
  public filterText: object = {};

  public editingURI: boolean = false;
  public editingSourceContext: boolean = false;
  
  displayedColumns = ['key', 'val'];
  displayedEntityColumns = ['name','datatype','expression','value'];
  displayedEntityColumns2 = ['name','datatype','expression','value'];

  dataSource: MatTableDataSource<any>;
  mapExpresions = {};
  mapExpValue: Array<any> = [];
  runningStatus = false;
  nestedEntityStatus: boolean = false;
  entName: string = '';
  isExpansionDetailRow : boolean = false;
  expandedElement: any;
  public fncLst: Object;
  dataSourceEntity: Array<any> = [];
  docsArray = [
    "/Users/nshrivas/Documents/HubProjects/data-hub-mapping-test/data/MOCK_DATA.json-0-1", 
    "/Users/nshrivas/Documents/HubProjects/data-hub-mapping-test/data/MOCK_DATA.json-0-10", 
    "/Users/nshrivas/Documents/HubProjects/data-hub-mapping-test/data/MOCK_DATA.json-0-100", 
    "/Users/nshrivas/Documents/HubProjects/data-hub-mapping-test/data/MOCK_DATA.json-0-1000", 
    "/Users/nshrivas/Documents/HubProjects/data-hub-mapping-test/data/MOCK_DATA.json-0-101", 
    "/Users/nshrivas/Documents/HubProjects/data-hub-mapping-test/data/MOCK_DATA.json-0-102", 
    "/Users/nshrivas/Documents/HubProjects/data-hub-mapping-test/data/MOCK_DATA.json-0-103", 
    "/Users/nshrivas/Documents/HubProjects/data-hub-mapping-test/data/MOCK_DATA.json-0-104", 
    "/Users/nshrivas/Documents/HubProjects/data-hub-mapping-test/data/MOCK_DATA.json-0-105", 
    "/Users/nshrivas/Documents/HubProjects/data-hub-mapping-test/data/MOCK_DATA.json-0-106", 
    "/Users/nshrivas/Documents/HubProjects/data-hub-mapping-test/data/MOCK_DATA.json-0-107", 
    "/Users/nshrivas/Documents/HubProjects/data-hub-mapping-test/data/MOCK_DATA.json-0-108", 
    "/Users/nshrivas/Documents/HubProjects/data-hub-mapping-test/data/MOCK_DATA.json-0-109" ];

    disableURINavLeft: boolean = false;
    disableURINavRight: boolean = false;
    uriIndex = 0;


  @ViewChild(MatTable)
  table: MatTable<any>;

  @ViewChild(MatPaginator)
  paginator: MatPaginator;

  @ViewChild(MatSort)
  sort: MatSort;

  @ViewChildren('fieldName') fieldName:QueryList<any>;

  /**
   * Update the sample document based on a URI.
   */

  ngOnInit(){
    if (!this.dataSource){
      
   this.dataSource = new MatTableDataSource<any>(this.sampleDocSrcProps);
    }
  if(_.isEmpty(this.mapExpresions)) {
    this.mapExpresions = this.conns;
  }
  this.isVersionCompatibleWithES = this.envService.settings.isVersionCompatibleWithES;
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }
  updateDataSource() {
    if (!this.dataSource){
      this.dataSource = new MatTableDataSource<any>(this.sampleDocSrcProps);
       }
    this.dataSource.data = this.sampleDocSrcProps;
  }

  renderRows(): void {
    this.updateDataSource();
    if(_.isEmpty(this.mapExpresions)) {
      this.mapExpresions = this.conns;
    }
  }

  onNestEntity(entProp){
    if (this.nestedEntityStatus) {
      this.nestedEntityStatus = false;
    } else {
    if(entProp.$ref || (entProp.items && entProp.items.$ref)) {
      if (entProp.$ref) {
        this.entName = entProp.$ref.split('/').pop();
      }
      else {
        this.entName = entProp.items.$ref.split('/').pop();
      }
    }
    //this.entName = 'ItemType';
    this.nestEntity.emit({
      nestEnt: this.nestEnt,
      entName: this.entName
    });
    this.nestedEntityStatus = true
  }
  }

  // populateDataSource(entityProp) {
  //   entityProp.forEach(obj => {
  //     this.dataSourceEntity.push(obj);

  //     if (obj.$ref || (obj.items && obj.items.$ref)) {
  //       if (obj.$ref) {
  //         this.entName = obj.$ref.split('/').pop();
  //       }
  //       else {
  //         this.entName = obj.items.$ref.split('/').pop();
  //       }

  //       //get nested Entity Name;
  //       this.nestEntity.emit({
  //         nestEnt: this.nestEnt,
  //         entName: this.entName
  //       });

  //       this.nestEnt.definition.properties.forEach(obj2 => {
  //         let tempObj = obj2;
  //         tempObj.name = obj.name + "." + obj2.name;
  //         this.dataSourceEntity.push(tempObj);
  //       });

  //     } else {
  //       return
  //     }
  //     //identify CH2
  //     //this.populateDataSource(this.nestEnt.definition.properties);
     

  //   });
  //   //console.log("entity",this.dataSourceEntity);

  //   return this.dataSourceEntity
  // }
  onNavigateURIList(index) {
    if (index < 0 || index > this.docsArray.length) {
      this.uriIndex = index;
      if (index < 0) {
        this.disableURINavLeft = true;
      } else {
        this.disableURINavRight = true;
      }


    } else {
      this.disableURINavLeft = false;
      this.disableURINavRight = false;

      //console.log("else part ", this.docsArray[index]);
      this.uriIndex = index;
      this.editURIVal = this.docsArray[index];

      this.onUpdateURI();

    }

  }
  onUpdateURI() {
    if (Object.keys(this.conns).length > 0) {
      let result = this.dialogService.confirm(
          'Changing your source document will remove<br/>existing property selections. Proceed?',
          'Cancel', 'OK');
      result.subscribe( () => {
          this.conns = {};
          this.editingURI = false;
          this.updateURI.emit({
            uri: this.editURIVal,
            uriOrig: this.mapping.sourceURI,
            conns: this.conns,
            connsOrig: this.connsOrig,
            save: true
          });
        },(err: any) => {
          console.log('source change aborted');
          this.editingURI = false;
        },
        () => {}
      );
    } else {
      this.editingURI = false;
      this.updateURI.emit({
        uri: this.editURIVal,
        uriOrig: this.mapping.sourceURI,
        conns: this.conns,
        connsOrig: {},
        save: true
      });
    }
  }

  /**
   * Cancel the editing of the source document URI.
   */
  cancelEditURI() {
    this.editURIVal = this.mapping.sourceURI;
    this.editingURI = false;
  }

  /**
   * Handle "Enter" keypress for the source document URI box.
   * @param event Event object
   */
  keyPressURI(event) {
    if (event.key === 'Enter') {
      this.onUpdateURI();
    }
  }

  /**
   * Handle when edit URI is not found.
   * @param uri URI not found
   */
  uriNotFound(uri) {
    let result = this.dialogService.alert(
      'No document found. You must ingest source documents',
      'OK'
    );
    result.subscribe( () => {
        this.editURIVal = this.mapping.sourceURI;
        // rollback to conns from previous URI
        if (!_.isEmpty(this.connsOrig)) {
          this.conns = this.connsOrig;
        }
      },
      () => {},
      () => {}
    )
  }

  constructor(
    private dialogService: MdlDialogService,
    private envService: EnvironmentService,
    public dialog: MatDialog
  ) {}

  /**
   * Handle changes of component properties.
   * @param changes SimpleChanges object with change information.
   */
  ngOnChanges(changes: SimpleChanges) {
    // Keep values up to date when mapping changes
    if (changes.mapping) {
      this.editURIVal = this.mapping.sourceURI;
    }
    if (changes.conns) {
      this.connsOrig = _.cloneDeep(changes.conns.currentValue);
    }
    if (changes.sampleDocSrcProps){
      this.renderRows();
       } 
  }

  /**
   * Handle property selection from source menu
   * @param entityPropName Entity property name of selection
   * @param srcPropName Source property name of selection
   */
  handleSelection(entityPropName, srcPropName): void {
    this.conns[entityPropName] = srcPropName;
    if (!_.isEqual(this.conns, this.connsOrig)) {
      this.onSaveMap();
    }
  }

  /**
   * Clear a property selection from source menu
   * @param event Event object, used to stop propagation
   * @param entityPropName Entity property name mapping to clear
   */
  clearSelection(event, entityPropName): void {
    if (this.conns[entityPropName])
      delete this.conns[entityPropName];
    if (!_.isEqual(this.conns, this.connsOrig)) {
      this.onSaveMap();
    }
    this.editingURI = false; // close edit box if open
    event.stopPropagation();
  }

  /**
   * Get property objects of source document
   * @param entityPropName Entity property name mapping to lookup
   * @param srcKey 'key', 'val' or 'type'
   * @returns {String} Value of the src data requested
   */
  getConnSrcData(entityPropName, srcKey): string {
    let data;
    let propertyKey = this.conns[entityPropName];

    if (this.sampleDocSrcProps.length > 0 && this.conns[entityPropName]) {
      let obj = _.find(this.sampleDocSrcProps, function(o) { return o && (o.key === propertyKey); });
      if (obj) {
        data = obj[srcKey];
      }
    }

    return (data) ? String(data) : data;
  }

  /**
   * Handle save event by emitting connection object.
   */
  onSaveMap() {
    this.updateMap.emit(this.conns);
    this.connsOrig = _.cloneDeep(this.conns);
  }

  /**
   * Have there been new selections since last map save?
   * @returns {boolean}
   */
  mapChanged() {
    return !_.isEqual(this.conns, this.connsOrig);
  }

  /**
   * Interpret the datatype of a property value
   * Recognize all JSON types: array, object, number, boolean, null
   * Also do a basic interpretation of dates (ISO 8601, RFC 2822)
   * @param value Property value
   * @returns {string} datatype ("array"|"object"|"number"|"date"|"boolean"|"null")
   */
  getType(value: any): string {
    let result = '';
    let RFC_2822 = 'ddd, DD MMM YYYY HH:mm:ss ZZ';
    if (_.isArray(value)) {
      result = 'array';
    } else if (_.isObject(value)) {
      result = 'object';
    }
    // Quoted numbers (example: "123") are not recognized as numbers
    else if (_.isNumber(value)) {
      result = 'number';
    }
    // Do not recognize ordinal dates (example: "1981095")
    else if (moment(value, [moment.ISO_8601, RFC_2822], true).isValid() && !/^\d+$/.test(value)) {
      result = 'date';
    } else if (_.isBoolean(value)) {
      result = 'boolean';
    } else if (_.isNull(value)) {
      result = 'null';
    } else {
      result = 'string';
    }
    return result;
  }

  /**
   * Should datatype be displayed with quotes?
   * @param property datatype
   * @returns {boolean}
   */
  isQuoted(type) {
    let typesToQuote = ['string', 'date'];
    return _.indexOf(typesToQuote, type) > -1;
  }

  /**
   * Trim start of long string and add prefix ('...trimmed-string'
   * @param str String to trim
   * @param num Character threshold
   * @param prefix Prefix to add
   * @returns {any} Trimmed string
   */
  getLastChars(str, num, prefix) {
    prefix = prefix ? prefix : '...';
    let result = str;
    if (typeof str === 'string' && str.length > num) {
      result = prefix + str.substr(str.length - num);
    }
    return result;
  }

  getInitialChars(str, num, suffix) {
    suffix = suffix ? suffix : '...';
    let result = str;
    if (typeof str === 'string' && str.length > num) {
      result = str.substr(0, num) + suffix;
    }
    return result;
  }

   /**
    * Return string if sufficiently long, otherwise empty string
    * @param str String to return
    * @param num Character threshold
    * @returns {any} string
    */
   getURITooltip(str, num) {
     let result = '';
     if (typeof str === 'string' && str.length > num) {
       result = str;
     }
     return result;
   }

  /**
   * Does entity property have an element range index set?
   * @param name Name of property
   * @returns {boolean}
   */
  hasElementRangeIndex(name) {
    return _.includes(this.targetEntity.definition.elementRangeIndex, name);
  }

  /**
   * Does entity property have a path range index set?
   * @param name Name of property
   * @returns {boolean}
   */
  hasRangeIndex(name) {
    return _.includes(this.targetEntity.definition.rangeIndex, name);
  }

  /**
   * Does entity property have a word lexicon set?
   * @param name Name of property
   * @returns {boolean}
   */
  hasWordLexicon(name) {
    return _.includes(this.targetEntity.definition.wordLexicon, name);
  }

  /**
   * Is an entity property required?
   * @param name Name of property
   * @returns {boolean}
   */
  isRequired(name) {
    return _.includes(this.targetEntity.definition.required, name);
  }

  /**
   * Is an entity property personally identifiable information?
   * @param name Name of property
   * @returns {boolean}
   */
  isPII(name) {
    return _.includes(this.targetEntity.definition.pii, name);
  }

      /**
   * Is an entity property the primary key?
   * @param name Name of property
   * @returns {boolean}
   */
  isPrimaryKey(name) {
    return _.includes(this.targetEntity.definition.primaryKey, name);
  }

  executeFunctions(funcName, propName) {
    this.mapExpresions[propName] = this.mapExpresions[propName] + " " + this.functionsDef(funcName);
    console.log(funcName, propName, this.mapExpresions[propName])
  }

  functionsDef(funcName) {
    return this.functionLst[funcName].signature
  }

  OpenFullSourceQuery() {
    let result = this.dialogService.alert(
      this.step.options.sourceQuery,
      'OK'
    );
    result.subscribe();

  }

  insertFunction(fname, index) {

    var startPos = this.fieldName.toArray()[index].nativeElement.selectionStart;
    this.fieldName.toArray()[index].nativeElement.focus();
    this.fieldName.toArray()[index].nativeElement.value = this.fieldName.toArray()[index].nativeElement.value.substr(0, this.fieldName.toArray()[index].nativeElement.selectionStart) + this.functionsDef(fname) + this.fieldName.toArray()[index].nativeElement.value.substr(this.fieldName.toArray()[index].nativeElement.selectionStart, this.fieldName.toArray()[index].nativeElement.value.length);

    this.fieldName.toArray()[index].nativeElement.selectionStart = startPos;
    this.fieldName.toArray()[index].nativeElement.selectionEnd = startPos + this.functionsDef(fname).length;
    this.fieldName.toArray()[index].nativeElement.focus();
  }

  insertField(fname, index) {

    var startPos = this.fieldName.toArray()[index].nativeElement.selectionStart;
    this.fieldName.toArray()[index].nativeElement.focus();
    this.fieldName.toArray()[index].nativeElement.value = this.fieldName.toArray()[index].nativeElement.value.substr(0, this.fieldName.toArray()[index].nativeElement.selectionStart) + fname + this.fieldName.toArray()[index].nativeElement.value.substr(this.fieldName.toArray()[index].nativeElement.selectionStart, this.fieldName.toArray()[index].nativeElement.value.length);

    this.fieldName.toArray()[index].nativeElement.selectionStart = startPos;
    this.fieldName.toArray()[index].nativeElement.selectionEnd = startPos + fname.length;
    this.fieldName.toArray()[index].nativeElement.focus();
  }
  checkEmptyObject(objName){
    return JSON.stringify(objName) === JSON.stringify({})
  }

}
