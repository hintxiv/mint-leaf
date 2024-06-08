export const drawImageFromSource = (
    context: CanvasRenderingContext2D,
    imageSrc: string,
    x: number,
    y: number,
    width: number,
    height: number,
) => {
    const image = new Image()
    image.src = imageSrc
    image.onload = () => {
        context.drawImage(image, x, y, width, height)
    }
}

export const drawImageFromHTML = (
    context: CanvasRenderingContext2D,
    image: HTMLImageElement | null,
    x: number,
    y: number,
    width: number,
    height: number,
) => {
    if (!image) return

    if (image.complete) {
        context.drawImage(image, x, y, width, height)
    } else {
        image.onload = () => {
            context.drawImage(image, x, y, width, height)
        }
    }
}
