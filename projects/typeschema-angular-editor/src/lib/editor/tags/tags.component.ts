import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';

@Component({
  selector: 'typeschema-tags',
  templateUrl: './tags.component.html',
  styleUrls: ['./tags.component.css']
})
export class TagsComponent implements OnInit {

  @Input() data?: Array<string> = [];
  @Output() dataChange = new EventEmitter<Array<string>>();

  constructor() { }

  ngOnInit(): void {
  }

  onChange(data?: string) {
    this.dataChange.emit(this.parseCsv(data));
  }

  parseCsv(data?: string): Array<string> {
    if (!data) {
      return [];
    }

    return data.split(',').map((el) => {
      return el.trim();
    }).filter(Boolean);
  }

}
