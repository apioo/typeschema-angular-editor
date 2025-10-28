import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Operation} from "../../model/Operation";

@Component({
  selector: 'typeschema-operation',
  templateUrl: './operation.component.html',
  styleUrls: ['./operation.component.css']
})
export class OperationComponent implements OnInit {

  @Input() operation!: Operation;
  @Input() operationIndex!: number;
  @Input() readonly!: boolean;

  @Output() argumentUp = new EventEmitter<{operationIndex: number, argumentIndex: number}>();
  @Output() argumentDown = new EventEmitter<{operationIndex: number, argumentIndex: number}>();
  @Output() argumentDelete = new EventEmitter<{operationIndex: number, argumentIndex: number}>();
  @Output() throwUp = new EventEmitter<{operationIndex: number, throwIndex: number}>();
  @Output() throwDown = new EventEmitter<{operationIndex: number, throwIndex: number}>();
  @Output() throwDelete = new EventEmitter<{operationIndex: number, throwIndex: number}>();
  @Output() operationEdit = new EventEmitter<number>();
  @Output() operationDelete = new EventEmitter<number>();
  @Output() operationCopy = new EventEmitter<number>();
  @Output() typeSelect = new EventEmitter<string>();

  ngOnInit(): void {
  }

  upArgument(operationIndex: number, argumentIndex: number) {
    this.argumentUp.emit({
      operationIndex,
      argumentIndex,
    });
  }

  downArgument(operationIndex: number, argumentIndex: number) {
    this.argumentDown.emit({
      operationIndex,
      argumentIndex,
    });
  }

  deleteArgument(operationIndex: number, argumentIndex: number) {
    this.argumentDelete.emit({
      operationIndex,
      argumentIndex,
    });
  }

  upThrow(operationIndex: number, throwIndex: number) {
    this.throwUp.emit({
      operationIndex,
      throwIndex,
    });
  }

  downThrow(operationIndex: number, throwIndex: number) {
    this.throwDown.emit({
      operationIndex,
      throwIndex,
    });
  }

  deleteThrow(operationIndex: number, throwIndex: number) {
    this.throwDelete.emit({
      operationIndex,
      throwIndex,
    });
  }

  editOperation(operationIndex: number) {
    this.operationEdit.emit(operationIndex);
  }

  deleteOperation(operationIndex: number) {
    this.operationDelete.emit(operationIndex);
  }

  copyOperation(operationIndex: number) {
    this.operationCopy.emit(operationIndex);
  }

  selectType(name: string) {
    this.typeSelect.emit(name);
  }

}
