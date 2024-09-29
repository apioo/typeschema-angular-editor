import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Specification} from "../../model/Specification";
import {Throw} from "../../model/Throw";

@Component({
  selector: 'typeschema-throws',
  templateUrl: './throw.component.html',
  styleUrls: ['./throw.component.css']
})
export class ThrowComponent implements OnInit {

  @Input() data: Array<Throw> = [];
  @Input() specification!: Specification;
  @Input() contentTypes!: Array<{name: string, value: string}>;
  @Output() dataChange = new EventEmitter<Array<Throw>>();

  result: Array<Throw> = [];

  newCode?: number;
  newType?: string;

  errorStatusCodes = [
    {key: 0, value: ''},
    {key: 400, value: 'Bad Request'},
    {key: 402, value: 'Payment Required'},
    {key: 403, value: 'Forbidden'},
    {key: 404, value: 'Not Found'},
    {key: 405, value: 'Method Not Allowed'},
    {key: 408, value: 'Request Timeout'},
    {key: 409, value: 'Conflict'},
    {key: 410, value: 'Gone'},
    {key: 412, value: 'Precondition Failed'},
    {key: 417, value: 'Expectation Failed'},
    {key: 422, value: 'Unprocessable Entity'},
    {key: 423, value: 'Locked'},
    {key: 424, value: 'Failed Dependency'},
    {key: 429, value: 'Too Many Requests'},
    {key: 499, value: '4xx'},
    {key: 500, value: 'Internal Server Error'},
    {key: 501, value: 'Not Implemented'},
    {key: 502, value: 'Bad Gateway'},
    {key: 503, value: 'Service Unavailable'},
    {key: 504, value: 'Gateway Timeout'},
    {key: 507, value: 'Insufficient Storage'},
    {key: 508, value: 'Loop Detected'},
    {key: 599, value: '5xx'},
    {key: 999, value: 'Any Error'},
  ]

  ngOnInit() {
    if (this.data) {
      this.result = [];
      this.data.forEach((entry) => {
        this.result.push(entry);
      })
    }
  }

  add() {
    if (!this.newCode || !this.newType) {
      return;
    }

    this.result.push({
      code: this.newCode,
      type: this.newType
    })

    this.newCode = undefined;
    this.newType = undefined;
  }

  remove(code?: number) {
    this.result = this.result.filter((row) => {
      if (code) {
        return row.code === code;
      } else {
        return row.code !== 0;
      }
    });
  }

  getNotUsedCodes() {
    return this.errorStatusCodes.filter((code) => {
      const selected = this.result.find((row) => {
        return row.code === code.key;
      });
      return !selected;
    });
  }

  changeValue() {
    const result: Array<Throw> = [];
    this.result.forEach((row) => {
      result.push(row);
    });

    this.dataChange.emit(result);
  }

}
