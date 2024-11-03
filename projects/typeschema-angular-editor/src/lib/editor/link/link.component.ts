import {Component, Input, OnInit} from '@angular/core';
import {ViewportScroller} from "@angular/common";

@Component({
  selector: 'typeschema-link',
  templateUrl: './link.component.html',
  styleUrls: ['./link.component.css']
})
export class LinkComponent implements OnInit {

  @Input() type!: string;
  @Input() linkable!: boolean;

  constructor(private viewportScroller: ViewportScroller) { }

  ngOnInit(): void {
  }

  scrollTo(type: string): void {
    this.viewportScroller.scrollToAnchor('type-' + type);
  }

}
