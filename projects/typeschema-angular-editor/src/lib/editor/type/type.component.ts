import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Type} from "../../model/Type";

@Component({
  selector: 'typeschema-type',
  templateUrl: './type.component.html',
  styleUrls: ['./type.component.css']
})
export class TypeComponent implements OnInit {

  @Input() type!: Type;
  @Input() typeIndex!: number;
  @Input() readonly!: boolean;
  @Input() root?: number;

  @Output() propertyUp = new EventEmitter<{typeIndex: number, propertyIndex: number}>();
  @Output() propertyDown = new EventEmitter<{typeIndex: number, propertyIndex: number}>();
  @Output() propertyNew = new EventEmitter<number>();
  @Output() propertyEdit = new EventEmitter<{typeIndex: number, propertyIndex: number}>();
  @Output() propertyDelete = new EventEmitter<{typeIndex: number, propertyIndex: number}>();
  @Output() typeEdit = new EventEmitter<number>();
  @Output() typeDelete = new EventEmitter<number>();
  @Output() typeCopy = new EventEmitter<number>();
  @Output() typeSelect = new EventEmitter<string>();
  @Output() rootSelect = new EventEmitter<number>();
  @Output() mappingDelete = new EventEmitter<{typeIndex: number, mappingKey: string}>();

  ngOnInit(): void {
  }

  upProperty(typeIndex: number, propertyIndex: number) {
    this.propertyUp.emit({
      typeIndex,
      propertyIndex,
    });
  }

  downProperty(typeIndex: number, propertyIndex: number) {
    this.propertyDown.emit({
      typeIndex,
      propertyIndex,
    });
  }

  newProperty(typeIndex: number) {
    this.propertyNew.emit(typeIndex);
  }

  editProperty(typeIndex: number, propertyIndex: number) {
    this.propertyEdit.emit({
      typeIndex,
      propertyIndex,
    });
  }

  deleteProperty(typeIndex: number, propertyIndex: number) {
    this.propertyDelete.emit({
      typeIndex,
      propertyIndex,
    });
  }

  editType(typeIndex: number) {
    this.typeEdit.emit(typeIndex);
  }

  deleteType(typeIndex: number) {
    this.typeDelete.emit(typeIndex);
  }

  copyType(typeIndex: number) {
    this.typeCopy.emit(typeIndex);
  }

  selectType(name: string) {
    this.typeSelect.emit(name);
  }

  selectRoot(index: number) {
    this.rootSelect.emit(index);
  }

  deleteMapping(typeIndex: number, mappingKey: string) {
    this.mappingDelete.emit({
      typeIndex,
      mappingKey,
    });
  }

}
