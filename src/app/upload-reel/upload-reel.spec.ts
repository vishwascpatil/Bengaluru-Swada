import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadReel } from './upload-reel';

describe('UploadReel', () => {
  let component: UploadReel;
  let fixture: ComponentFixture<UploadReel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UploadReel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UploadReel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
