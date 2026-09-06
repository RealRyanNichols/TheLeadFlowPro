// macOS visual QA aid. Usage: swift scripts/social-image-ocr.swift path/to/image.png [...]
// OCR is supporting evidence; a reviewer must also inspect the final image.
import Foundation
import Vision
import ImageIO

struct Observation: Codable {
    let text: String
    let confidence: Float
    let x: Double
    let y: Double
    let width: Double
    let height: Double
}
struct Result: Codable {
    let file: String
    let observations: [Observation]
}

var results: [Result] = []
for file in CommandLine.arguments.dropFirst() {
    let url = URL(fileURLWithPath: file)
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.recognitionLanguages = ["en-US"]
    request.usesLanguageCorrection = false
    let handler = VNImageRequestHandler(url: url)
    try handler.perform([request])
    let observations = (request.results ?? []).compactMap { observation -> Observation? in
        guard let candidate = observation.topCandidates(1).first else { return nil }
        let rect = observation.boundingBox
        return Observation(text: candidate.string, confidence: candidate.confidence,
                           x: rect.minX, y: rect.minY, width: rect.width, height: rect.height)
    }
    results.append(Result(file: file, observations: observations))
}
let encoder = JSONEncoder()
encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
FileHandle.standardOutput.write(try encoder.encode(results))
