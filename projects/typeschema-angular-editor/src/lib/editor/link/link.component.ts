import {Component, Input, OnInit} from '@angular/core';

@Component({
  selector: 'typeschema-link',
  templateUrl: './link.component.html',
  styleUrls: ['./link.component.css']
})
export class LinkComponent implements OnInit {

  @Input() type!: string;
  @Input() linkable!: boolean;

  constructor() { }

  ngOnInit(): void {
  }

}
