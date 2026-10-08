import React from 'react'
import { Composition } from 'remotion'
import { Video, DURACION } from './Video'
import { Generico, DURACION_G } from './Generico'
export const Root: React.FC = () => (
  <>
    <Composition id="Fercam" component={Video} durationInFrames={DURACION} fps={30} width={1080} height={1920} />
    <Composition id="Generico" component={Generico} durationInFrames={DURACION_G} fps={30} width={1080} height={1920} />
  </>
)
